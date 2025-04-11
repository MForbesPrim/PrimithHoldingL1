from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import Response
from gmft.auto import TableDetector, AutoTableFormatter
from gmft.pdf_bindings import PyPDFium2Document
from openpyxl import Workbook
from openpyxl.utils.dataframe import dataframe_to_rows
from openpyxl.styles import Alignment
import pandas as pd
import io
import tempfile
import logging
import os
import asyncio

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Table Extraction Service")

# Create temp directory if it doesn't exist
TEMP_DIR = os.path.join(os.getcwd(), 'temp')
os.makedirs(TEMP_DIR, exist_ok=True)

def write_df_to_excel(df, sheet):
    """
    Writes a DataFrame to an Excel sheet with improved handling.
    """
    # Work on a copy
    df_to_write = df.copy() 
    
    # Check for empty DataFrame
    if df_to_write.empty:
        logging.warning(f"DataFrame for sheet '{sheet.title}' is empty, nothing to write.")
        return
    
    # Check if first data row is empty
    first_row_values = df_to_write.iloc[0].astype(str).tolist()
    is_first_row_empty = all(str(val).strip() == '' for val in first_row_values)
    if is_first_row_empty:
        logging.info(f"First data row in sheet '{sheet.title}' is empty, excluding it.")
        df_to_write = df_to_write.iloc[1:].reset_index(drop=True)
    
    # Check if DataFrame became empty
    if df_to_write.empty:
        logging.warning(f"DataFrame for sheet '{sheet.title}' is empty after processing, nothing to write.")
        return
    
    # Determine if we should use headers from columns
    write_header_row = True
    try:
        current_cols = df_to_write.columns.tolist()
        expected_numeric_cols = list(range(len(current_cols)))
        if [str(c) for c in current_cols] == [str(n) for n in expected_numeric_cols]:
            logging.info(f"Using data rows as headers for sheet '{sheet.title}'")
            write_header_row = False
    except Exception as e:
        logging.warning(f"Column check failed for sheet '{sheet.title}': {e}")
    
    # Write the data
    for r_idx, row in enumerate(dataframe_to_rows(df_to_write, index=False, header=write_header_row), 1):
        for c_idx, value in enumerate(row, 1):
            cell_value = "" if pd.isna(value) else value
            cell = sheet.cell(row=r_idx, column=c_idx, value=cell_value)
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    
    # Adjust column widths
    for column_cells in sheet.columns:
        try:
            if not column_cells: continue
            column = column_cells[0].column_letter
            max_length = 0
            for cell in column_cells:
                if cell.value is not None:
                    cell_str = str(cell.value)
                    lines = cell_str.splitlines()
                    cell_max_line_length = max(len(line) for line in lines) if lines else 0
                    max_length = max(max_length, cell_max_line_length)
            adjusted_width = min((max_length + 2) * 1.15, 70)
            sheet.column_dimensions[column].width = adjusted_width
        except Exception as e:
            logging.warning(f"Could not set width for column {column}: {e}")

async def process_pdf_with_timeout(pdf_path, timeout=300):
    """Process PDF with a timeout to prevent hanging"""
    try:
        return await asyncio.wait_for(_process_pdf(pdf_path), timeout=timeout)
    except asyncio.TimeoutError:
        logging.error(f"Processing timed out after {timeout} seconds")
        raise HTTPException(status_code=504, detail="Processing timed out. Try with a smaller PDF.")

async def _process_pdf(pdf_path):
    """Asynchronous PDF processing function"""
    detector = TableDetector()
    formatter = AutoTableFormatter()
    
    workbook = Workbook()
    if "Sheet" in workbook.sheetnames:
        workbook.remove(workbook["Sheet"])
    
    sheets_added_count = 0
    
    try:
        # Use the PyPDFium2Document method from your working code
        doc = PyPDFium2Document(pdf_path)
        
        try:
            for page_num, page in enumerate(doc, start=1):
                tables = detector.extract(page)
                if not tables:
                    continue
                
                for table_num, table in enumerate(tables, start=1):
                    try:
                        formatted_table = formatter.extract(table)
                        if not formatted_table or formatted_table.df is None:
                            logging.warning(f"No data for table {table_num} on page {page_num}.")
                            continue
                        
                        df = formatted_table.df()
                        if df.empty:
                            logging.info(f"Empty table {table_num} on page {page_num}.")
                            continue
                        
                        # Clean data
                        df = df.astype(str)
                        df.replace('None', '', inplace=True)
                        df.replace('nan', '', inplace=True)
                        df = df.map(lambda x: x.replace('\\n', '\n') if isinstance(x, str) else x)
                        
                        # Create sheet and write data
                        sheet_title = f"Page_{page_num}-Table_{table_num}"
                        if sheet_title in workbook.sheetnames:
                            sheet_title = f"{sheet_title}_{sheets_added_count+1}"
                        
                        sheet = workbook.create_sheet(title=sheet_title)
                        write_df_to_excel(df, sheet)
                        sheets_added_count += 1
                        
                    except Exception as e:
                        logging.error(f"Error processing table {table_num} on page {page_num}: {str(e)}", exc_info=True)
        finally:
            try:
                doc.close()
                logging.info("PDF document closed.")
            except Exception as e:
                logging.error(f"Error closing PDF document: {e}")
    
    except Exception as e:
        logging.error(f"Error processing PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF processing error: {str(e)}")
    
    # Check if any sheets were added
    if sheets_added_count == 0:
        logging.warning("No tables were successfully extracted.")
        if not workbook.sheetnames:
            workbook.create_sheet("No Tables Found")
    
    # Save workbook to buffer
    excel_buffer = io.BytesIO()
    workbook.save(excel_buffer)
    excel_buffer.seek(0)
    
    return excel_buffer.getvalue()

@app.post("/extract-tables")
async def extract_tables(file: UploadFile = File(...)):
    """
    Upload a PDF file and receive an Excel file with extracted tables.
    Uses temporary file storage for better memory management.
    """
    if not file or not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Check file size
        file.file.seek(0, 2)  # Go to end of file
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        file_size_mb = file_size / (1024 * 1024)
        logging.info(f"Processing PDF: {file.filename}, size: {file_size_mb:.2f} MB")
        
        # Set size limit (adjust as needed)
        MAX_FILE_SIZE_MB = 30
        if file_size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=413, 
                detail=f"File too large: {file_size_mb:.2f}MB exceeds limit of {MAX_FILE_SIZE_MB}MB"
            )
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir=TEMP_DIR) as temp_pdf:
            # Read in chunks to avoid memory issues
            chunk_size = 1024 * 1024  # 1MB
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                temp_pdf.write(chunk)
            
            temp_pdf_path = temp_pdf.name
        
        try:
            # Process with timeout
            excel_content = await process_pdf_with_timeout(temp_pdf_path)
            
            output_filename = f"extracted_{file.filename.rsplit('.', 1)[0]}.xlsx"
            
            return Response(
                content=excel_content,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=\"{output_filename}\""
                }
            )
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_pdf_path)
                logging.info(f"Temporary file removed: {temp_pdf_path}")
            except Exception as e:
                logging.warning(f"Failed to remove temporary file: {e}")
    
    except ImportError as e:
        logging.error(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=f"Server configuration error: Missing dependency {e}")
    except Exception as e:
        logging.error(f"Critical error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "Table Extraction Service. POST PDF to /extract-tables"}
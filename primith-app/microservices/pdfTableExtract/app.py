from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
# Ensure correct import paths if gmft is installed differently
from gmft.auto import TableDetector, AutoTableFormatter
from gmft.pdf_bindings import PyPDFium2Document
from openpyxl import Workbook
from openpyxl.utils.dataframe import dataframe_to_rows
from openpyxl.styles import Alignment
import pandas as pd
import io
import logging
import re

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI(title="Table Extraction Service")

def write_df_to_excel(df, sheet):
    """
    Writes a DataFrame to an Excel sheet. If df columns are [0,1,2...],
    it assumes headers are already in data rows and skips writing
    a separate header row via dataframe_to_rows.
    Also handles empty first data row removal and cell formatting.
    """
    df_to_write = df.copy() # Work on a copy

    # --- Check and potentially remove empty first DATA row ---
    # This checks if the *first row of actual data* (after header processing) is blank
    if not df_to_write.empty:
        first_row_values = df_to_write.iloc[0].astype(str).tolist()
        is_first_row_empty = all(str(val).strip() == '' for val in first_row_values)
        if is_first_row_empty:
            logging.info(f"First data row in sheet '{sheet.title}' is empty, excluding it.")
            df_to_write = df_to_write.iloc[1:].reset_index(drop=True)

    # --- Check if DataFrame became empty ---
    if df_to_write.empty:
         logging.warning(f"DataFrame for sheet '{sheet.title}' is empty, nothing to write.")
         return # Exit if nothing to write

    # --- Determine if dataframe_to_rows should write its own header ---
    write_header_row_from_columns = True # Default assumption
    try:
        # Get the current column labels of the DataFrame to be written
        current_cols = df_to_write.columns.tolist()
        # Create the expected sequence [0, 1, 2, ...] based on the number of columns
        expected_numeric_cols = list(range(len(current_cols)))

        # Compare if the current column labels EXACTLY match the sequence [0, 1, 2, ...]
        # Converting to string for robust comparison, although they should be integers here
        if [str(c) for c in current_cols] == [str(n) for n in expected_numeric_cols]:
            logging.info(f"Detected numeric columns {current_cols} for sheet '{sheet.title}'. "
                         f"Assuming headers are in data rows, setting header=False for dataframe_to_rows.")
            # If columns are [0, 1, 2,...], the headers are already in the data rows from multi-line processing.
            # So, don't let dataframe_to_rows add another header row.
            write_header_row_from_columns = False
    except Exception as e:
        logging.warning(f"Could not reliably check columns for numeric sequence in sheet '{sheet.title}': {e}. "
                        f"Defaulting to write_header_row_from_columns=True.")


    # --- Write DataFrame content to Excel ---
    # Use the determined flag for the 'header' argument
    # If write_header_row_from_columns is False, it writes ALL rows from df_to_write starting at Excel row 1.
    # If True, it writes the df_to_write.columns as row 1, and data from row 2 onwards.
    for r_idx, row in enumerate(dataframe_to_rows(df_to_write, index=False, header=write_header_row_from_columns), 1):
        for c_idx, value in enumerate(row, 1):
            cell_value = "" if pd.isna(value) else value
            cell = sheet.cell(row=r_idx, column=c_idx, value=cell_value)
            cell.alignment = Alignment(
                horizontal='center',
                vertical='center',
                wrap_text=True
            )

    # --- Adjust column widths considering wrapped text ---
    # (Column width adjustment logic remains the same as previous version)
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

@app.post("/extract-tables")
async def extract_tables(file: UploadFile = File(...)):
    """
    Upload a PDF file and receive an Excel file with extracted tables.
    Includes enhanced debugging for removing specific numeric header row.
    """
    if not file or not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        pdf_content = await file.read()
        pdf_buffer = io.BytesIO(pdf_content)

        detector = TableDetector()
        formatter = AutoTableFormatter()

        workbook = Workbook()
        if "Sheet" in workbook.sheetnames:
             workbook.remove(workbook["Sheet"])

        doc = PyPDFium2Document(pdf_buffer)
        sheets_added_count = 0

        try:
            for page_num, page in enumerate(doc, start=1):
                tables = detector.extract(page)
                if not tables:
                    continue

                for table_num, table in enumerate(tables, start=1):
                    try:
                        formatted_table = formatter.extract(table)
                        if not formatted_table or formatted_table.df is None:
                           logging.warning(f"Formatter returned no df for table {table_num} on page {page_num}.")
                           continue

                        df = formatted_table.df()
                        if df.empty:
                            logging.info(f"Extracted empty DataFrame table {table_num} on page {page_num}.")
                            continue

                        # --- Log initial df structure ---
                        logging.info(f"DEBUG p{page_num}-t{table_num}: ----- Start Table Processing -----")
                        try:
                            logging.info(f"DEBUG p{page_num}-t{table_num}: Initial df head:\n{df.head(3).to_string()}")
                            logging.info(f"DEBUG p{page_num}-t{table_num}: Initial df columns: {df.columns.tolist()}")
                            logging.info(f"DEBUG p{page_num}-t{table_num}: Initial df shape: {df.shape}")
                        except Exception as log_err:
                            logging.error(f"DEBUG p{page_num}-t{table_num}: Error logging initial df structure: {log_err}")
                        # --- End Initial Log ---

                        # --- Handle potential multi-line headers ---
                        multi_line_headers_processed = False # Flag to see if this block runs
                        df.columns = df.columns.astype(str)
                        original_columns = df.columns
                        num_cols = len(original_columns)
                        header_data = []
                        max_lines = 1
                        for col in original_columns:
                            cleaned_col = col.replace('\\n', '\n')
                            lines = cleaned_col.splitlines()
                            if not lines and cleaned_col == '': lines = ['']
                            elif not lines: lines = [cleaned_col]
                            max_lines = max(max_lines, len(lines))
                            header_data.append(lines)

                        if max_lines > 1:
                            multi_line_headers_processed = True # Mark that this logic ran
                            logging.info(f"DEBUG p{page_num}-t{table_num}: Adjusting for multi-line headers (max {max_lines} lines)...")
                            padded_headers = [h + [''] * (max_lines - len(h)) for h in header_data]
                            header_df = pd.DataFrame(padded_headers).T
                            standard_cols = range(num_cols)
                            header_df.columns = standard_cols
                            df.columns = standard_cols
                            df = pd.concat([header_df, df], ignore_index=True)
                        # --- End Multi-line Header Handling ---

                        # --- Log df structure AFTER potential multi-line handling ---
                        try:
                            logging.info(f"DEBUG p{page_num}-t{table_num}: Ran multi-line header logic? {multi_line_headers_processed}")
                            logging.info(f"DEBUG p{page_num}-t{table_num}: df head AFTER multi-line handling:\n{df.head(3).to_string()}")
                            logging.info(f"DEBUG p{page_num}-t{table_num}: df columns AFTER multi-line handling: {df.columns.tolist()}")
                            logging.info(f"DEBUG p{page_num}-t{table_num}: df shape AFTER multi-line handling: {df.shape}")
                        except Exception as log_err:
                            logging.error(f"DEBUG p{page_num}-t{table_num}: Error logging df structure after multi-line handling: {log_err}")
                         # --- End After Multi-line Log ---

                        # === START: Check specific numeric DATA row ['0', '1', '2', ...] ===
                        numeric_row_removed = False # Flag
                        if not df.empty:
                            current_num_cols = len(df.columns)
                            numeric_header_sequence = [str(i) for i in range(current_num_cols)]

                            logging.info(f"DEBUG p{page_num}-t{table_num}: Checking first data row for numeric sequence...")
                            logging.info(f"DEBUG p{page_num}-t{table_num}: Expected sequence for row check: {numeric_header_sequence}")

                            try:
                                # Get the first row's values, convert to string, strip whitespace
                                first_row_values = [str(v).strip() for v in df.iloc[0].tolist()]
                                logging.info(f"DEBUG p{page_num}-t{table_num}: Actual first row values (stripped): {first_row_values}")

                                # Compare the stripped actual first row with the target sequence
                                if first_row_values == numeric_header_sequence:
                                    logging.info(f"MATCH FOUND - Removing numeric data row: {numeric_header_sequence} from table p{page_num}-t{table_num}")
                                    df = df.iloc[1:].reset_index(drop=True)
                                    numeric_row_removed = True # Mark as removed
                                else:
                                    logging.info(f"NO MATCH - First data row values do not match expected numeric sequence.")

                            except IndexError:
                                logging.warning(f"DEBUG p{page_num}-t{table_num}: Cannot check df.iloc[0] - DataFrame might be empty or only have headers after processing.")
                            except Exception as check_err:
                                logging.error(f"DEBUG p{page_num}-t{table_num}: Error during numeric row check: {check_err}")
                        else:
                            logging.info(f"DEBUG p{page_num}-t{table_num}: DataFrame is empty before numeric row check.")
                        # === END: Check specific numeric DATA row ===

                        # --- Log df structure AFTER potential numeric row removal ---
                        try:
                            logging.info(f"DEBUG p{page_num}-t{table_num}: Numeric row removed? {numeric_row_removed}")
                            logging.info(f"DEBUG p{page_num}-t{table_num}: df head AFTER numeric row check:\n{df.head(3).to_string()}")
                            logging.info(f"DEBUG p{page_num}-t{table_num}: df columns AFTER numeric row check: {df.columns.tolist()}")
                            logging.info(f"DEBUG p{page_num}-t{table_num}: df shape AFTER numeric row check: {df.shape}")
                        except Exception as log_err:
                            logging.error(f"DEBUG p{page_num}-t{table_num}: Error logging df structure after numeric row check: {log_err}")
                        # --- End After Numeric Row Check Log ---


                        # --- Clean data values ---
                        if df.empty:
                             logging.warning(f"DataFrame empty before final cleaning for table p{page_num}-t{table_num}. Skipping.")
                             continue

                        df = df.astype(str)
                        df.replace('None', '', inplace=True)
                        df.replace('nan', '', inplace=True)
                        df = df.map(lambda x: x.replace('\\n', '\n') if isinstance(x, str) else x)

                        # --- Create sheet and write data ---
                        sheet_title = f"Page_{page_num}-Table_{table_num}"
                        if sheet_title in workbook.sheetnames:
                            sheet_title = f"{sheet_title}_{sheets_added_count+1}"
                        sheet = workbook.create_sheet(title=sheet_title)
                        sheets_added_count += 1

                        write_df_to_excel(df, sheet)

                    except pd.errors.InvalidIndexError as e:
                         logging.error(f"Pandas Index Error processing table {table_num} on page {page_num}: {str(e)}", exc_info=True)
                    except Exception as e:
                        logging.error(f"Generic error processing table {table_num} on page {page_num}: {str(e)}", exc_info=True)


        finally:
            # ... (closing doc logic remains the same) ...
             try:
                 doc.close()
                 logging.info("PDF document closed.")
             except Exception as e:
                 logging.error(f"Error closing PDF document: {e}")

        # ... (checking sheets_added_count and saving to excel_buffer remains the same) ...
        if sheets_added_count == 0:
             logging.warning("No tables were successfully extracted or processed to add to Excel.")
             if not workbook.sheetnames:
                 workbook.create_sheet("No Tables Found")

        excel_buffer = io.BytesIO()
        workbook.save(excel_buffer)
        excel_buffer.seek(0)

        output_filename = f"extracted_{file.filename.rsplit('.', 1)[0]}.xlsx"

        return Response(
            content=excel_buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=\"{output_filename}\""
            }
        )

    # ... (exception handling for ImportError and other critical errors remains the same) ...
    except ImportError as e:
         logging.error(f"Import error: {e}. Ensure libraries (gmft, PyPDFium2, openpyxl, pandas) are installed.")
         raise HTTPException(status_code=500, detail=f"Server configuration error: Missing dependency {e}")
    except Exception as e:
        logging.error(f"Critical error in extract_tables: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@app.get("/health")
async def health_check():
    """ Health check endpoint """
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "Table Extraction Service. POST PDF to /extract-tables endpoint"}
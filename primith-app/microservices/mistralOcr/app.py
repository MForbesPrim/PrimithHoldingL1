from urllib import request
import fastapi
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import PlainTextResponse # Return markdown as plain text
from mistralai import Mistral # Import both classes directly # Import specific exception
import os
import io
import tempfile
import logging
import asyncio
import gc
from contextlib import asynccontextmanager
from dotenv import load_dotenv # For local .env loading
import re

# --- Configuration ---
# Load environment variables from .env file for local development
load_dotenv()

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY")
if not MISTRAL_API_KEY:
    # This should ideally cause the app to fail startup in production if key is missing
    logging.error("MISTRAL_API_KEY environment variable not set.")
    # For now, we'll raise an error later if client creation fails
    # raise ValueError("MISTRAL_API_KEY environment variable not set.")

# Global variable for the Mistral client
mistral_client = None

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - [%(threadName)s] - %(message)s')
logger = logging.getLogger(__name__)

# Create temp directory
TEMP_DIR = os.path.join(os.getcwd(), 'temp_ocr_files')
os.makedirs(TEMP_DIR, exist_ok=True)
logger.info(f"Temporary directory set to: {TEMP_DIR}")

# Mistral Limits
MAX_FILE_SIZE_MB_MISTRAL = 50
MAX_FILE_SIZE_BYTES_MISTRAL = MAX_FILE_SIZE_MB_MISTRAL * 1024 * 1024

# --- Lifespan Management for Mistral Client ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global mistral_client
    logger.info("Application startup: Initializing Mistral client...")
    try:
        if MISTRAL_API_KEY:
             mistral_client = Mistral(api_key=MISTRAL_API_KEY)
             # Optional: Make a simple test call if needed, e.g., list models
             # models = mistral_client.models.list()
             # logger.info(f"Mistral client initialized successfully. Available models (sample): {models.data[:2]}")
             logger.info("Mistral client initialized successfully.")
        else:
             logger.error("Cannot initialize Mistral client: API key is missing.")
             # You might want the app to not fully start in a real scenario
             # For now, it will raise errors when used later.
    except Exception as e:
        logger.error(f"An unexpected error occurred during Mistral client initialization: {e}", exc_info=True)

    yield # Application runs here

    logger.info("Application shutdown: Cleaning up resources...")
    mistral_client = None # Clear reference
    gc.collect()


app = FastAPI(title="Mistral OCR Service", lifespan=lifespan)

# --- Synchronous Processing Function ---
def _perform_mistral_ocr(file_path: str, original_filename: str) -> str:
    """
    Handles uploading to Mistral, getting URL, and performing OCR.
    Runs in a separate thread via asyncio.to_thread.
    """
    global mistral_client
    if not mistral_client:
        logger.error("Mistral client is not available.")
        raise RuntimeError("Mistral client not initialized. Check API key.")

    logger.info(f"Starting Mistral OCR process for: {original_filename} (path: {file_path})")
    uploaded_file_info = None
    signed_url_info = None

    try:
        # 1. Upload the file to Mistral
        logger.debug(f"Uploading {original_filename} to Mistral files API...")
        with open(file_path, "rb") as f:
            uploaded_file_info = mistral_client.files.upload(
                file={"file_name": original_filename, "content": f},
                purpose="ocr"
            )
        logger.info(f"File uploaded successfully to Mistral. File ID: {uploaded_file_info.id}")

        # 2. Get the signed URL (Mistral OCR needs a URL)
        logger.debug(f"Retrieving signed URL for file ID: {uploaded_file_info.id}")
        signed_url_info = mistral_client.files.get_signed_url(file_id=uploaded_file_info.id)
        logger.info(f"Signed URL retrieved successfully.")

        # 3. Call the OCR process using the signed URL
        logger.debug(f"Calling Mistral OCR process for URL: {signed_url_info.url[:50]}...") # Log truncated URL
        ocr_response = mistral_client.ocr.process(
            model="mistral-ocr-latest", # Use the specified model
            document={
                "type": "document_url",
                "document_url": signed_url_info.url,
            }
            # Add include_image_base64=True if needed
        )
        logger.info(f"Mistral OCR processing completed successfully for {original_filename}.")

        # Assuming the response structure has the content directly or needs specific access
        # Adjust based on actual mistralai library response structure
        # Example: Accessing markdown content if it's structured like response.content or similar
        # Check the actual ocr_response object structure from the library documentation
        if hasattr(ocr_response, 'content'): # Placeholder check - VERIFY actual attribute
            markdown_content = ocr_response.content
        elif isinstance(ocr_response, str): # If the response itself is the string
             markdown_content = ocr_response
        else:
             # If it's more complex, you might need to serialize parts of it
             # For now, assume it returns a string or has a .content attribute
             # This might need adjustment based on the library's return type for ocr.process
             logger.warning(f"Unexpected OCR response format: {type(ocr_response)}. Attempting string conversion.")
             markdown_content = str(ocr_response) # Fallback, likely needs refinement

        return markdown_content

    except Exception as e:
        logger.error(f"Unexpected error during OCR process for {original_filename}: {e}", exc_info=True)
        raise RuntimeError(f"Unexpected error during OCR: {e}") from e
    finally:
        # Optional: Delete the file from Mistral storage if desired, requires file ID
        if uploaded_file_info:
            try:
                logger.debug(f"Attempting to delete Mistral file: {uploaded_file_info.id}")
                # Uncomment below if you want to delete the file after processing
                # deleted_status = mistral_client.files.delete(file_id=uploaded_file_info.id)
                # logger.info(f"Mistral file deletion status for {uploaded_file_info.id}: {deleted_status}")
            except Exception as e: # Catch generic Exception FOR NOW
                # Check the type of the actual exception raised
                logger.error(f"Mistral interaction error of type {type(e).__name__} for {original_filename}: {e}", exc_info=True)
                # Re-raise for now, or handle based on type if you see a pattern
                raise RuntimeError(f"Mistral interaction failed: {e}") from e
        gc.collect()


# --- Async Wrapper with Timeout ---
async def process_document_with_timeout(file_path: str, original_filename: str, timeout: int = 300):
    """
    Calls the synchronous OCR function in a thread with a timeout.
    """
    logger.info(f"Scheduling Mistral OCR for {original_filename} with timeout {timeout}s")
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(_perform_mistral_ocr, file_path, original_filename),
            timeout=timeout
        )
        logger.info(f"Successfully processed document in thread: {original_filename}")
        return result
    except asyncio.TimeoutError:
        logger.error(f"Processing timed out after {timeout} seconds for {original_filename}")
        raise HTTPException(status_code=504, detail=f"OCR processing timed out after {timeout} seconds.")
    except Exception as e:
        logger.error(f"Error during threaded document processing for {original_filename}: {str(e)}", exc_info=True)
        # Check if it's a known error type maybe? For now, wrap it.
        raise HTTPException(status_code=500, detail=f"OCR processing failed: ({type(e).__name__}) {str(e)}")
    
@app.post("/ocr/chat")
async def ocr_and_chat_endpoint(file: UploadFile = File(...), message: str = Form(...)):
    """
    Upload a document, perform OCR, and then chat with the extracted content.
    Returns a JSON response with the chat result.
    """
    global mistral_client
    if not mistral_client:
        logger.error("Mistral client is not available.")
        raise HTTPException(status_code=500, detail="Mistral client not initialized. Check API key.")
    
    try:
        # Validate file
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="Invalid input: No file provided.")

        # Simple content type check
        allowed_content_types = ["application/pdf", "image/jpeg", "image/png"]
        content_type = file.content_type
        
        # Check for X-File-Type header - FIXED THIS PART
        x_file_type = None
        request = fastapi.Request
        try:
            # In FastAPI, file headers are accessed through the file object itself
            x_file_type = file.headers.get("x-file-type")
            if x_file_type:
                logger.info(f"Received X-File-Type header: {x_file_type}")
        except Exception as e:
            logger.warning(f"Error accessing headers: {e}")
        
        # If content type is octet-stream but filename ends with .pdf, treat as PDF
        if content_type == "application/octet-stream":
            if file.filename.lower().endswith('.pdf') or x_file_type == "application/pdf":
                logger.info(f"Treating {file.filename} as PDF despite content_type={content_type}")
                content_type = "application/pdf"
            elif file.filename.lower().endswith(('.jpg', '.jpeg')) or x_file_type == "image/jpeg":
                logger.info(f"Treating {file.filename} as JPEG despite content_type={content_type}")
                content_type = "image/jpeg"
            elif file.filename.lower().endswith('.png') or x_file_type == "image/png":
                logger.info(f"Treating {file.filename} as PNG despite content_type={content_type}")
                content_type = "image/png"
        
        if content_type not in allowed_content_types:
             logger.warning(f"Invalid file type: {content_type} for file {file.filename}")
             raise HTTPException(
                status_code=415, # Unsupported Media Type
                detail=f"Unsupported file type: {content_type}. Allowed types: {', '.join(allowed_content_types)}"
             )

        temp_file_path = None
        try:
            # Save upload to a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}", dir=TEMP_DIR) as temp_file:
                temp_file_path = temp_file.name
                logger.info(f"Receiving file: {file.filename}. Saving to temp path: {temp_file_path}")

                file_size = 0
                chunk_size = 1024 * 1024 # 1MB chunks
                while True:
                    chunk = await file.read(chunk_size)
                    if not chunk:
                        break
                    file_size += len(chunk)

                    # Check size against Mistral limit
                    if file_size > MAX_FILE_SIZE_BYTES_MISTRAL:
                         logger.warning(f"File rejected: Size exceeds Mistral limit of {MAX_FILE_SIZE_MB_MISTRAL}MB.")
                         temp_file.close()
                         os.unlink(temp_file_path)
                         temp_file_path = None
                         raise HTTPException(
                            status_code=413,
                            detail=f"File too large: Exceeds Mistral limit of {MAX_FILE_SIZE_MB_MISTRAL}MB"
                         )
                    temp_file.write(chunk)

                file_size_mb = file_size / (1024 * 1024)
                logger.info(f"Finished writing {file_size_mb:.2f} MB to {temp_file_path}")

            # Step 1: Process the document with OCR
            logger.info(f"Processing OCR for file: {file.filename}")
            processing_timeout = 600 # 10 minutes timeout for OCR processing
            document_text = await process_document_with_timeout(
                temp_file_path,
                file.filename,
                timeout=processing_timeout
            )
            
            logger.info(f"OCR extraction successful, now processing chat request")

            # Parse tables in the OCR output
            ocr_tables = []
            remaining_text = document_text
            
            # Find all tables in the OCR output
            table_regex = re.compile(r'\|([^\n]+)\|\n\|([-|\s]+)\|\n((?:\|[^\n]+\|\n?)*)')
            table_matches = list(table_regex.finditer(document_text))
            
            if table_matches:
                logger.info(f"Found {len(table_matches)} tables in OCR output")
                
                # Process each table
                for i, match in enumerate(table_matches):
                    table_start = match.start()
                    table_end = match.end()
                    
                    # Extract table content
                    table_content = document_text[table_start:table_end]
                    
                    # Parse the table
                    table_data = parse_markdown_table(table_content)
                    if table_data:
                        ocr_tables.append({
                            "index": i,
                            "start": table_start,
                            "end": table_end,
                            "data": table_data
                        })
                
                # Replace tables with placeholders in the text
                for table in reversed(ocr_tables):
                    placeholder = f"[TABLE_{table['index']}]"
                    remaining_text = (
                        remaining_text[:table['start']] + 
                        placeholder + 
                        remaining_text[table['end']:]
                    )
                
                logger.info(f"Processed {len(ocr_tables)} tables from OCR output")

            # Step 2: Process chat with the extracted text
            # Get the model from environment variables
            model = os.environ.get("MISTRAL_MODEL", "mistral-small-2501")
            agent_id = os.environ.get("MISTRAL_AGENT_ID")
            logger.info(f"Using Mistral model: {model}")

            # Create formatted user message with document context
            # Send the processed OCR text with table placeholders
            formatted_user_message = f"Document Content:\n\n{remaining_text}\n\nUser Question: {message}"
            
            # Add information about tables if they exist
            if ocr_tables:
                table_info = "\n\nThis document contains the following tables:\n"
                for i, table in enumerate(ocr_tables):
                    headers = ", ".join(table['data']['headers'])
                    table_info += f"Table {i+1}: {headers}\n"
                formatted_user_message += table_info

            # Check if we have an agent ID
            if agent_id:
                logger.info(f"Using agent with ID: {agent_id}")
                # When using an agent, we only need a user message
                messages = [
                    {
                        "role": "user",
                        "content": formatted_user_message
                    }
                ]
                
                # Make the API call with agent
                chat_response = mistral_client.agents.complete(
                    agent_id=agent_id,
                    messages=messages,
                )
            else:
                logger.info("No agent ID found, using standard chat")
                # Standard chat with system and user messages
                messages = [
                    {
                        "role": "system",
                        "content": "You are an expert consultant helping with document analysis. Use the document content to answer user questions as accurately as possible. If the document doesn't contain information needed to answer the question, be honest about it. When referring to tables, use the table numbers provided."
                    },
                    {
                        "role": "user",
                        "content": formatted_user_message
                    }
                ]
                
                # Make the API call without agent
                chat_response = mistral_client.chat.complete(
                    model=model,
                    messages=messages
                )
            
            # Extract the assistant's message
            assistant_message = chat_response.choices[0].message.content
            
            # Parse tables in the response for client display
            table = parse_markdown_table(assistant_message)
            
            # Create response object
            result = {
                "response": assistant_message,
            }
            
            # Add table if found in the response
            if table:
                result["table"] = table
            
            # Add OCR tables if they exist
            if ocr_tables:
                result["ocr_tables"] = [table["data"] for table in ocr_tables]
            
            logger.info(f"Chat completion successful, response length: {len(assistant_message)}")
            return result

        finally:
            # Ensure temporary file is always deleted
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                    logger.info(f"Temporary file removed: {temp_file_path}")
                except Exception as e:
                    logger.error(f"CRITICAL: Failed to remove temporary file {temp_file_path}: {e}", exc_info=True)
            gc.collect()
            
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions directly
        raise http_exc
    except Exception as e:
        logger.error(f"Error in ocr_and_chat_endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    

# Add a new endpoint for chat with document content
@app.post("/chat/with-document")
async def chat_with_document_endpoint(request: fastapi.Request):
    """
    Process a chat request with document content.
    Expects a JSON body with 'document_text' and 'user_message'.
    Returns a JSON response with the chat result.
    """
    global mistral_client
    if not mistral_client:
        logger.error("Mistral client is not available.")
        raise HTTPException(status_code=500, detail="Mistral client not initialized. Check API key.")
    
    try:
        # Parse request body
        body = await request.json()
        document_text = body.get("document_text")
        user_message = body.get("user_message")
        
        if not document_text:
            raise HTTPException(status_code=400, detail="Missing document_text in request")
        if not user_message:
            raise HTTPException(status_code=400, detail="Missing user_message in request")
        
        logger.info(f"Processing chat with document. User message: {user_message[:50]}...")
        
        # Create formatted user message with document context
        formatted_user_message = f"Document Content:\n\n{document_text}\n\nUser Question: {user_message}"
        
        # Get the model from environment variables
        model = os.environ.get("MISTRAL_MODEL", "mistral-small-2501")
        logger.info(f"Using Mistral model: {model}")
        
        # Prepare messages
        messages = [
            {
                "role": "system",
                "content": "You are an expert consultant helping with document analysis. Use the document content to answer user questions as accurately as possible. If the document doesn't contain information needed to answer the question, be honest about it."
            },
            {
                "role": "user",
                "content": formatted_user_message
            }
        ]
        
        # Make the API call
        chat_response = mistral_client.chat.complete(
            model=model,
            messages=messages
        )
        
        # Extract the assistant's message
        assistant_message = chat_response.choices[0].message.content
        
        # Parse tables in the response
        table = parse_markdown_table(assistant_message)
        
        # Create response object
        result = {
            "response": assistant_message,
        }
        
        # Add table if found
        if table:
            result["table"] = table
        
        logger.info(f"Chat completion successful, response length: {len(assistant_message)}")
        return result
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error in chat_with_document_endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")
    
def parse_markdown_table(content: str):
    """
    Parse markdown tables in the content.
    Returns a dict with headers and rows if a table is found, otherwise None.
    """
    # Look for markdown table in the content
    table_regex = re.compile(r'\|([^\n]+)\|\n\|([-|\s]+)\|\n((?:\|[^\n]+\|\n?)*)')
    match = table_regex.search(content)
    
    if not match:
        return None
    
    # Parse headers
    header_row = match.group(1).strip()
    headers = [header.strip() for header in header_row.split('|') if header.strip()]
    
    # Parse rows
    rows_text = match.group(3).strip()
    rows = []
    for row_text in rows_text.split('\n'):
        if not row_text.strip():
            continue
        row = [cell.strip() for cell in row_text.split('|') if cell.strip()]
        if row:
            rows.append(row)
    
    return {
        "headers": headers,
        "rows": rows
    }

# --- FastAPI Endpoint ---
@app.post("/ocr/process", response_class=PlainTextResponse)
async def process_document_endpoint(file: UploadFile = File(...)):
    """
    Upload a document (PDF, image), send it to Mistral OCR,
    and return the extracted content as markdown text.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Invalid input: No file provided.")

    # Simple content type check (can be expanded)
    allowed_content_types = ["application/pdf", "image/jpeg", "image/png"]
    content_type = file.content_type
    
    # Check for X-File-Type header from our Go backend
    x_file_type = None
    if 'x-file-type' in file.headers:
        x_file_type = file.headers['x-file-type']
        logger.info(f"Received X-File-Type header: {x_file_type}")
    
    # If content type is octet-stream but filename ends with .pdf, treat as PDF
    if content_type == "application/octet-stream":
        if file.filename.lower().endswith('.pdf') or x_file_type == "application/pdf":
            logger.info(f"Treating {file.filename} as PDF despite content_type={content_type}")
            content_type = "application/pdf"
        elif file.filename.lower().endswith(('.jpg', '.jpeg')) or x_file_type == "image/jpeg":
            logger.info(f"Treating {file.filename} as JPEG despite content_type={content_type}")
            content_type = "image/jpeg"
        elif file.filename.lower().endswith('.png') or x_file_type == "image/png":
            logger.info(f"Treating {file.filename} as PNG despite content_type={content_type}")
            content_type = "image/png"
    
    if content_type not in allowed_content_types:
         logger.warning(f"Invalid file type: {content_type} for file {file.filename}")
         raise HTTPException(
            status_code=415, # Unsupported Media Type
            detail=f"Unsupported file type: {content_type}. Allowed types: {', '.join(allowed_content_types)}"
         )

    temp_file_path = None
    try:
        # Save upload to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}", dir=TEMP_DIR) as temp_file:
            temp_file_path = temp_file.name
            logger.info(f"Receiving file: {file.filename}. Saving to temp path: {temp_file_path}")

            file_size = 0
            chunk_size = 1024 * 1024 # 1MB chunks
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                file_size += len(chunk)

                # Check size against Mistral limit WHILE writing chunks
                if file_size > MAX_FILE_SIZE_BYTES_MISTRAL:
                     logger.warning(f"File rejected: Size exceeds Mistral limit of {MAX_FILE_SIZE_MB_MISTRAL}MB.")
                     # Need to close and delete the partially written temp file
                     temp_file.close()
                     os.unlink(temp_file_path)
                     temp_file_path = None # Ensure finally block doesn't try to delete again
                     raise HTTPException(
                        status_code=413, # Payload Too Large
                        detail=f"File too large: Exceeds Mistral limit of {MAX_FILE_SIZE_MB_MISTRAL}MB"
                     )
                temp_file.write(chunk)

            file_size_mb = file_size / (1024 * 1024)
            logger.info(f"Finished writing {file_size_mb:.2f} MB to {temp_file_path}")

        # Process the temporary file (adjust timeout as needed)
        processing_timeout = 600 # 10 minutes, adjust based on typical Mistral processing times
        markdown_result = await process_document_with_timeout(
            temp_file_path,
            file.filename,
            timeout=processing_timeout
        )

        logger.info(f"Successfully processed {file.filename}. Returning markdown content.")
        # Return as plain text markdown
        return PlainTextResponse(content=markdown_result)

    except HTTPException as http_exc:
        # Re-raise HTTP exceptions directly
        raise http_exc
    except Exception as e:
        logger.error(f"Unhandled error in process_document_endpoint for {file.filename}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {str(e)}")
    finally:
        # Ensure temporary file is always deleted
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.info(f"Temporary file removed: {temp_file_path}")
            except Exception as e:
                logger.error(f"CRITICAL: Failed to remove temporary file {temp_file_path}: {e}", exc_info=True)
        gc.collect()


@app.get("/health")
async def health_check():
    """Basic health check endpoint."""
    # Could add a check for mistral_client initialization status
    status = "healthy"
    if not mistral_client:
        status = "degraded: Mistral API client not initialized"
    logger.debug(f"Health check requested. Status: {status}")
    return {"status": status}

@app.get("/")
async def root():
    """Root endpoint providing basic info."""
    return {"message": "Mistral OCR Microservice. POST document to /ocr/process"}

# Local development runner (only executes when script is run directly)
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Uvicorn server for LOCAL DEVELOPMENT...")
    # Use reload=True for development. Host 127.0.0.1 is safer locally.
    uvicorn.run("app:app", host="127.0.0.1", port=8001, reload=True)
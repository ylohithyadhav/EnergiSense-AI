import pytest
import io
import pandas as pd
from fastapi import UploadFile, HTTPException
from app.services.csv_service import process_and_validate_csv, get_stored_dataset

@pytest.mark.anyio
async def test_csv_upload_valid():
    csv_content = (
        "timestamp,building_id,energy_kwh,air_temperature\n"
        "2024-01-01 00:00:00,B1,50.2,14.5\n"
        "2024-01-01 01:00:00,B1,48.1,14.0\n"
        "2024-01-01 02:00:00,B1,45.6,13.8\n"
    ).encode("utf-8")

    upload_file = UploadFile(
        filename="test_energy.csv",
        file=io.BytesIO(csv_content)
    )

    result = await process_and_validate_csv(upload_file)
    assert result["total_rows"] == 3
    assert result["total_columns"] == 4
    assert "timestamp" in result["columns"]
    assert "energy_kwh" in result["columns"]
    assert result["suggested_mapping"]["timestamp_col"] == "timestamp"
    assert result["suggested_mapping"]["target_col"] == "energy_kwh"

    stored_df = get_stored_dataset(result["file_id"])
    assert stored_df is not None
    assert len(stored_df) == 3

@pytest.mark.anyio
async def test_csv_upload_invalid_extension():
    upload_file = UploadFile(
        filename="invalid_file.txt",
        file=io.BytesIO(b"hello world")
    )
    with pytest.raises(HTTPException) as exc_info:
        await process_and_validate_csv(upload_file)
    assert exc_info.value.status_code == 400
    assert "Only CSV files" in exc_info.value.detail

@pytest.mark.anyio
async def test_csv_upload_empty():
    upload_file = UploadFile(
        filename="empty.csv",
        file=io.BytesIO(b"")
    )
    with pytest.raises(HTTPException) as exc_info:
        await process_and_validate_csv(upload_file)
    assert exc_info.value.status_code == 400

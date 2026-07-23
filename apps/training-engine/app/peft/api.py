"""PEFT REST API endpoints."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from peft import __version__ as peft_version

from app.logger import training_logger
from app.middleware import verify_token
from app.model.loader import ModelLoader, model_loader
from app.peft.adapter.runtime import AdapterRuntime, adapter_runtime
from app.peft.exceptions import (
    AdapterException,
    AdapterNotFoundError,
    CompatibilityException,
    ConfigurationException,
    PEFTException,
)
from app.peft.factory import PEFTFactory, peft_factory
from app.peft.lora.detector import TargetModuleDetector, target_module_detector
from app.peft.manager import PEFTManager, peft_manager
from app.peft.schemas import (
    AdapterListResponse,
    AdapterMetadata,
    ApplyPEFTRequest,
    CreatePEFTRequest,
    PEFTHealthResponse,
    PEFTResponse,
    RemovePEFTRequest,
    TargetModulesResponse,
    ValidatePEFTRequest,
    ValidationResult,
)
from app.peft.validator import PEFTValidator, peft_validator

router = APIRouter(prefix="/peft")


@router.post(
    "/create",
    response_model=PEFTResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create PEFT Adapter",
    description="Create and apply a PEFT adapter to a model",
)
async def create_peft_adapter(
    request: CreatePEFTRequest,
    token: str = Depends(verify_token),
) -> PEFTResponse:
    """
    Create PEFT adapter.
    
    Args:
        request: PEFT creation request
        token: Authentication token
        
    Returns:
        PEFT response with adapter metadata
    """
    training_logger.info(
        f"Creating {request.adapter_type.value} adapter for model {request.model_id}"
    )

    try:
        # Load model
        model = model_loader.load_model(request.model_id)

        # Create adapter
        peft_model, metadata = peft_manager.create_adapter(model, request)

        return PEFTResponse(
            success=True,
            message=f"Adapter created successfully: {metadata.adapter_name}",
            adapter_id=metadata.adapter_id,
            metadata=metadata,
        )

    except ConfigurationException as e:
        training_logger.error(f"Configuration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Configuration error: {str(e)}",
        )

    except CompatibilityException as e:
        training_logger.error(f"Compatibility error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Compatibility error: {str(e)}",
        )

    except PEFTException as e:
        training_logger.error(f"PEFT error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PEFT error: {str(e)}",
        )

    except Exception as e:
        training_logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.post(
    "/apply",
    response_model=PEFTResponse,
    summary="Apply PEFT Adapter",
    description="Apply existing PEFT adapter to a model",
)
async def apply_peft_adapter(
    request: ApplyPEFTRequest,
    token: str = Depends(verify_token),
) -> PEFTResponse:
    """
    Apply existing PEFT adapter.
    
    Args:
        request: Apply PEFT request
        token: Authentication token
        
    Returns:
        PEFT response
    """
    training_logger.info(
        f"Applying adapter {request.adapter_id} to model {request.model_id}"
    )

    try:
        # Load model
        model = model_loader.load_model(request.model_id)

        # Apply adapter
        peft_model = peft_manager.apply_adapter(
            model, request.adapter_id, request.model_id
        )

        # Get adapter metadata
        metadata = peft_manager.get_adapter_info(request.adapter_id)

        return PEFTResponse(
            success=True,
            message=f"Adapter applied successfully",
            adapter_id=request.adapter_id,
            metadata=AdapterMetadata(**metadata),
        )

    except AdapterNotFoundError as e:
        training_logger.error(f"Adapter not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Adapter not found: {str(e)}",
        )

    except AdapterException as e:
        training_logger.error(f"Adapter error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adapter error: {str(e)}",
        )

    except Exception as e:
        training_logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.post(
    "/remove",
    response_model=PEFTResponse,
    summary="Remove PEFT Adapter",
    description="Remove PEFT adapter from a model",
)
async def remove_peft_adapter(
    request: RemovePEFTRequest,
    token: str = Depends(verify_token),
) -> PEFTResponse:
    """
    Remove PEFT adapter.
    
    Args:
        request: Remove PEFT request
        token: Authentication token
        
    Returns:
        PEFT response
    """
    training_logger.info(
        f"Removing adapter {request.adapter_name} from model {request.model_id}"
    )

    try:
        # Load model
        model = model_loader.load_model(request.model_id)

        # Remove adapter
        base_model = peft_manager.remove_adapter(
            model, request.adapter_name, request.model_id
        )

        return PEFTResponse(
            success=True,
            message=f"Adapter removed successfully: {request.adapter_name}",
        )

    except AdapterException as e:
        training_logger.error(f"Adapter error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adapter error: {str(e)}",
        )

    except Exception as e:
        training_logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.post(
    "/validate",
    response_model=ValidationResult,
    summary="Validate PEFT Configuration",
    description="Validate PEFT configuration for a model",
)
async def validate_peft_config(
    request: ValidatePEFTRequest,
    token: str = Depends(verify_token),
) -> ValidationResult:
    """
    Validate PEFT configuration.
    
    Args:
        request: Validation request
        token: Authentication token
        
    Returns:
        Validation result
    """
    training_logger.info(
        f"Validating {request.adapter_type.value} config for model {request.model_id}"
    )

    try:
        # Load model
        model = model_loader.load_model(request.model_id)

        # Validate configuration
        validation_report = peft_manager.validate_configuration(
            model, request.adapter_type, request.config
        )

        return ValidationResult(
            valid=validation_report.get("valid", False),
            model_compatible=validation_report.get("model_compatible", False),
            config_valid=validation_report.get("config_valid", False),
            target_modules_valid=validation_report.get("target_modules_valid", False),
            issues=validation_report.get("issues", []),
            warnings=validation_report.get("warnings", []),
        )

    except Exception as e:
        training_logger.error(f"Validation error: {str(e)}")
        return ValidationResult(
            valid=False,
            model_compatible=False,
            config_valid=False,
            target_modules_valid=False,
            issues=[str(e)],
        )


@router.get(
    "/list",
    response_model=AdapterListResponse,
    summary="List Adapters",
    description="List all PEFT adapters with optional filters",
)
async def list_adapters(
    model_id: Optional[str] = None,
    adapter_type: Optional[str] = None,
    active_only: bool = False,
    token: str = Depends(verify_token),
) -> AdapterListResponse:
    """
    List PEFT adapters.
    
    Args:
        model_id: Optional model ID filter
        adapter_type: Optional adapter type filter
        active_only: Only return active adapters
        token: Authentication token
        
    Returns:
        List of adapters
    """
    training_logger.info("Listing PEFT adapters")

    try:
        # List adapters
        adapters_data = adapter_runtime.list_adapters(
            model_id=model_id,
            adapter_type=adapter_type,
            active_only=active_only,
        )

        # Convert to metadata objects
        adapters = [AdapterMetadata(**data) for data in adapters_data]

        return AdapterListResponse(
            adapters=adapters,
            total=len(adapters),
        )

    except Exception as e:
        training_logger.error(f"Failed to list adapters: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list adapters: {str(e)}",
        )


@router.get(
    "/{adapter_id}",
    response_model=PEFTResponse,
    summary="Get Adapter",
    description="Get PEFT adapter by ID",
)
async def get_adapter(
    adapter_id: str,
    token: str = Depends(verify_token),
) -> PEFTResponse:
    """
    Get PEFT adapter.
    
    Args:
        adapter_id: Adapter ID
        token: Authentication token
        
    Returns:
        PEFT response with adapter metadata
    """
    training_logger.info(f"Getting adapter: {adapter_id}")

    try:
        # Get adapter metadata
        metadata_dict = peft_manager.get_adapter_info(adapter_id)
        metadata = AdapterMetadata(**metadata_dict)

        return PEFTResponse(
            success=True,
            message="Adapter retrieved successfully",
            adapter_id=adapter_id,
            metadata=metadata,
        )

    except AdapterNotFoundError as e:
        training_logger.error(f"Adapter not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Adapter not found: {str(e)}",
        )

    except Exception as e:
        training_logger.error(f"Failed to get adapter: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get adapter: {str(e)}",
        )


@router.get(
    "/metadata/{adapter_id}",
    response_model=Dict[str, Any],
    summary="Get Adapter Metadata",
    description="Get detailed metadata for a PEFT adapter",
)
async def get_adapter_metadata(
    adapter_id: str,
    token: str = Depends(verify_token),
) -> Dict[str, Any]:
    """
    Get adapter metadata.
    
    Args:
        adapter_id: Adapter ID
        token: Authentication token
        
    Returns:
        Adapter metadata dictionary
    """
    training_logger.info(f"Getting metadata for adapter: {adapter_id}")

    try:
        # Get comprehensive summary
        summary = adapter_runtime.get_adapter_summary(adapter_id)

        return summary

    except AdapterNotFoundError as e:
        training_logger.error(f"Adapter not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Adapter not found: {str(e)}",
        )

    except Exception as e:
        training_logger.error(f"Failed to get metadata: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get metadata: {str(e)}",
        )


@router.get(
    "/detect-modules/{model_id}",
    response_model=TargetModulesResponse,
    summary="Detect Target Modules",
    description="Auto-detect target modules for LoRA in a model",
)
async def detect_target_modules(
    model_id: str,
    preset: str = "default",
    token: str = Depends(verify_token),
) -> TargetModulesResponse:
    """
    Detect target modules.
    
    Args:
        model_id: Model ID
        preset: Detection preset
        token: Authentication token
        
    Returns:
        Detected target modules
    """
    training_logger.info(f"Detecting target modules for model: {model_id}")

    try:
        # Load model
        model = model_loader.load_model(model_id)

        # Detect modules
        detected = target_module_detector.auto_detect_target_modules(
            model, preset=preset
        )

        # Get stats
        stats = target_module_detector.get_module_stats(model)

        return TargetModulesResponse(
            model_id=model_id,
            detected_modules=detected,
            recommended_modules=stats.get("recommended_targets", detected[:5]),
            total_modules=stats.get("total_modules", 0),
        )

    except Exception as e:
        training_logger.error(f"Failed to detect modules: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to detect modules: {str(e)}",
        )


@router.get(
    "/health",
    response_model=PEFTHealthResponse,
    summary="PEFT Health Check",
    description="Check PEFT service health and status",
)
async def peft_health() -> PEFTHealthResponse:
    """
    PEFT health check.
    
    Returns:
        Health status
    """
    try:
        # Validate environment
        peft_validator.validate_environment()

        # Get runtime stats
        stats = adapter_runtime.get_runtime_stats()

        return PEFTHealthResponse(
            status="healthy",
            healthy=True,
            active_adapters=stats.get("active_adapters", 0),
            supported_types=["lora"],
            peft_version=peft_version,
        )

    except Exception as e:
        training_logger.error(f"Health check failed: {str(e)}")
        return PEFTHealthResponse(
            status="unhealthy",
            healthy=False,
            active_adapters=0,
            supported_types=["lora"],
            peft_version=peft_version,
        )

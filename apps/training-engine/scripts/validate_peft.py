"""Validation script for PEFT installation."""

import sys
from typing import List, Tuple


def check_imports() -> Tuple[bool, List[str]]:
    """Check if all required imports work."""
    print("Checking imports...")
    errors = []

    # Core imports
    try:
        import torch
        print(f"✓ PyTorch {torch.__version__}")
    except ImportError as e:
        errors.append(f"✗ PyTorch import failed: {e}")

    try:
        import transformers
        print(f"✓ Transformers {transformers.__version__}")
    except ImportError as e:
        errors.append(f"✗ Transformers import failed: {e}")

    try:
        import peft
        print(f"✓ PEFT {peft.__version__}")
    except ImportError as e:
        errors.append(f"✗ PEFT import failed: {e}")

    # PEFT modules
    try:
        from app.peft import (
            peft_manager,
            peft_factory,
            lora_builder,
            peft_validator,
            adapter_manager,
            adapter_runtime,
            target_module_detector,
        )
        print("✓ All PEFT modules imported successfully")
    except ImportError as e:
        errors.append(f"✗ PEFT modules import failed: {e}")

    return len(errors) == 0, errors


def check_environment() -> Tuple[bool, List[str]]:
    """Check environment compatibility."""
    print("\nChecking environment...")
    errors = []

    # Python version
    if sys.version_info < (3, 10):
        errors.append(f"✗ Python 3.10+ required, got {sys.version_info.major}.{sys.version_info.minor}")
    else:
        print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor}")

    # PEFT validator
    try:
        from app.peft import peft_validator
        peft_validator.validate_environment()
        print("✓ PEFT environment validated")
    except Exception as e:
        errors.append(f"✗ Environment validation failed: {e}")

    return len(errors) == 0, errors


def check_functionality() -> Tuple[bool, List[str]]:
    """Check basic functionality."""
    print("\nChecking functionality...")
    errors = []

    try:
        import torch.nn as nn
        from app.peft import peft_factory

        # Create simple model
        class TestModel(nn.Module):
            def __init__(self):
                super().__init__()
                self.linear1 = nn.Linear(10, 5)
                self.linear2 = nn.Linear(5, 2)

            def forward(self, x):
                return self.linear2(self.linear1(x))

        model = TestModel()
        print("✓ Test model created")

        # Create LoRA adapter
        peft_model, metadata = peft_factory.create_lora(
            model=model,
            model_id="test-validation",
            rank=4,
            alpha=8,
            target_modules=["linear1", "linear2"],
        )
        print("✓ LoRA adapter created")

        # Verify metadata
        if metadata["trainable_params"] > 0:
            print(f"✓ Trainable params: {metadata['trainable_params']:,} ({metadata['trainable_percent']:.2f}%)")
        else:
            errors.append("✗ No trainable parameters found")

    except Exception as e:
        errors.append(f"✗ Functionality check failed: {e}")

    return len(errors) == 0, errors


def check_api() -> Tuple[bool, List[str]]:
    """Check API availability."""
    print("\nChecking API...")
    errors = []

    try:
        from app.peft import api
        print("✓ PEFT API module available")

        # Check if router exists
        if hasattr(api, 'router'):
            print("✓ API router configured")
        else:
            errors.append("✗ API router not found")

    except Exception as e:
        errors.append(f"✗ API check failed: {e}")

    return len(errors) == 0, errors


def main():
    """Run all validation checks."""
    print("=" * 60)
    print("PEFT Installation Validation")
    print("=" * 60)

    all_passed = True
    all_errors = []

    # Run checks
    checks = [
        ("Imports", check_imports),
        ("Environment", check_environment),
        ("Functionality", check_functionality),
        ("API", check_api),
    ]

    for check_name, check_func in checks:
        try:
            passed, errors = check_func()
            if not passed:
                all_passed = False
                all_errors.extend(errors)
        except Exception as e:
            all_passed = False
            all_errors.append(f"✗ {check_name} check crashed: {e}")

    # Print summary
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL CHECKS PASSED")
        print("=" * 60)
        print("\nPEFT is properly installed and configured!")
        print("\nNext steps:")
        print("1. Start the server: python main.py")
        print("2. Check health: curl http://localhost:8000/api/v1/peft/health")
        print("3. Read PEFT_QUICKSTART.md for usage examples")
        return 0
    else:
        print("❌ SOME CHECKS FAILED")
        print("=" * 60)
        print("\nErrors:")
        for error in all_errors:
            print(f"  {error}")
        print("\nPlease fix the errors above and run validation again.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

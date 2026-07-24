#!/usr/bin/env python3
"""
Verification script for Phase 4.4.4.5.7 - Enterprise Distributed Training Engine

This script verifies that all components are properly installed and functional.
"""

import sys
from pathlib import Path


def print_header(text: str):
    """Print section header."""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_status(item: str, status: bool, details: str = ""):
    """Print verification status."""
    symbol = "[OK]" if status else "[FAIL]"
    print(f"{symbol} {item}")
    if details:
        print(f"   {details}")


def verify_dependencies():
    """Verify required dependencies."""
    print_header("Checking Dependencies")
    
    dependencies = {
        "torch": "PyTorch",
        "transformers": "Hugging Face Transformers",
        "accelerate": "Hugging Face Accelerate",
        "pydantic": "Pydantic",
        "fastapi": "FastAPI",
    }
    
    optional_deps = {
        "deepspeed": "DeepSpeed (optional)",
        "pynvml": "NVIDIA ML (optional)",
    }
    
    all_good = True
    
    for module, name in dependencies.items():
        try:
            __import__(module)
            version = __import__(module).__version__
            print_status(name, True, f"Version: {version}")
        except ImportError:
            print_status(name, False, "Not installed")
            all_good = False
    
    for module, name in optional_deps.items():
        try:
            __import__(module)
            version = getattr(__import__(module), "__version__", "unknown")
            print_status(name, True, f"Version: {version}")
        except ImportError:
            print_status(name, True, "Not installed (optional)")
    
    return all_good


def verify_modules():
    """Verify distributed training modules."""
    print_header("Checking Distributed Training Modules")
    
    modules = [
        ("app.distributed", "Distributed Package"),
        ("app.distributed.distributed_manager", "Distributed Manager"),
        ("app.distributed.device_manager", "Device Manager"),
        ("app.distributed.accelerate_integration", "Accelerate Integration"),
        ("app.distributed.ddp_integration", "DDP Integration"),
        ("app.distributed.fsdp_integration", "FSDP Integration"),
        ("app.distributed.deepspeed_integration", "DeepSpeed Integration"),
        ("app.distributed.schemas", "Schemas"),
        ("app.distributed.exceptions", "Exceptions"),
        ("app.distributed.api", "REST API"),
        ("app.distributed.cluster", "Cluster Management"),
        ("app.distributed.launcher", "Process Launcher"),
        ("app.distributed.communication", "Communication Layer"),
        ("app.distributed.health", "Health Monitoring"),
        ("app.distributed.runtime", "Runtime Metrics"),
        ("app.distributed.services", "Services Layer"),
    ]
    
    all_good = True
    
    for module_path, name in modules:
        try:
            __import__(module_path)
            print_status(name, True)
        except ImportError as e:
            print_status(name, False, str(e))
            all_good = False
    
    return all_good


def verify_device_detection():
    """Verify device detection."""
    print_header("Checking Device Detection")
    
    try:
        from app.distributed import device_manager
        
        # Detect devices
        devices = device_manager.detect_devices()
        print_status("Device Detection", True, f"Found {len(devices)} device(s)")
        
        for device in devices:
            print(f"   - {device.device_name} ({device.device_type.value})")
        
        # Get recommendations
        backend = device_manager.get_recommended_backend()
        precision = device_manager.get_recommended_precision()
        
        print_status("Backend Recommendation", True, backend.value)
        print_status("Precision Recommendation", True, precision.value)
        
        return True
        
    except Exception as e:
        print_status("Device Detection", False, str(e))
        return False


def verify_initialization():
    """Verify distributed service initialization."""
    print_header("Checking Service Initialization")
    
    try:
        from app.distributed import distributed_service
        from app.distributed.schemas import DistributedConfig, DistributedStrategy
        
        # Test initialization
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        status = distributed_service.initialize(config)
        print_status("Service Initialization", True)
        print_status("Main Process Check", status.is_main_process)
        print_status("World Size", True, f"{status.world_size}")
        
        # Cleanup
        distributed_service.shutdown()
        print_status("Service Shutdown", True)
        
        return True
        
    except Exception as e:
        print_status("Service Initialization", False, str(e))
        return False


def verify_files():
    """Verify file structure."""
    print_header("Checking File Structure")
    
    base_path = Path(__file__).parent / "app" / "distributed"
    
    required_files = [
        "__init__.py",
        "distributed_manager.py",
        "device_manager.py",
        "accelerate_integration.py",
        "ddp_integration.py",
        "fsdp_integration.py",
        "deepspeed_integration.py",
        "api.py",
        "schemas.py",
        "exceptions.py",
        "README.md",
    ]
    
    required_dirs = [
        "cluster",
        "launcher",
        "communication",
        "health",
        "runtime",
        "services",
    ]
    
    all_good = True
    
    for file in required_files:
        file_path = base_path / file
        exists = file_path.exists()
        print_status(f"File: {file}", exists)
        if not exists:
            all_good = False
    
    for dir_name in required_dirs:
        dir_path = base_path / dir_name
        exists = dir_path.exists() and dir_path.is_dir()
        print_status(f"Directory: {dir_name}/", exists)
        if not exists:
            all_good = False
    
    return all_good


def verify_tests():
    """Verify test files."""
    print_header("Checking Test Files")
    
    test_path = Path(__file__).parent / "tests" / "test_distributed"
    
    test_files = [
        "test_device_manager.py",
        "test_distributed_manager.py",
        "test_accelerate_integration.py",
        "test_health_monitor.py",
        "test_communication.py",
        "test_services.py",
    ]
    
    all_good = True
    
    for test_file in test_files:
        file_path = test_path / test_file
        exists = file_path.exists()
        print_status(f"Test: {test_file}", exists)
        if not exists:
            all_good = False
    
    return all_good


def verify_documentation():
    """Verify documentation files."""
    print_header("Checking Documentation")
    
    base_path = Path(__file__).parent
    
    doc_files = [
        "app/distributed/README.md",
        "DISTRIBUTED_QUICKSTART.md",
        "PHASE_4_4_4_5_7_COMPLETE.md",
        "PHASE_4_4_4_5_7_STATUS.md",
        "DISTRIBUTED_INDEX.md",
    ]
    
    all_good = True
    
    for doc_file in doc_files:
        file_path = base_path / doc_file
        exists = file_path.exists()
        print_status(f"Doc: {doc_file}", exists)
        if not exists:
            all_good = False
    
    return all_good


def print_summary(results: dict):
    """Print verification summary."""
    print_header("Verification Summary")
    
    total = len(results)
    passed = sum(1 for r in results.values() if r)
    
    print(f"\nTotal Checks: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    
    if passed == total:
        print("\n[OK] All checks passed! Phase 4.4.4.5.7 is ready.")
        print("\nNext steps:")
        print("  1. Read DISTRIBUTED_QUICKSTART.md")
        print("  2. Try examples/distributed_training_example.py")
        print("  3. Run tests: pytest tests/test_distributed/")
        print("  4. Start the API: python main.py")
        return 0
    else:
        print("\n[FAIL] Some checks failed. Please review the output above.")
        print("\nFailed checks:")
        for name, result in results.items():
            if not result:
                print(f"  - {name}")
        return 1


def main():
    """Main verification function."""
    print("""
+===================================================================+
|                                                                   |
|   Phase 4.4.4.5.7 - Enterprise Distributed Training Engine       |
|   Verification Script                                             |
|                                                                   |
+===================================================================+
    """)
    
    results = {
        "Dependencies": verify_dependencies(),
        "Modules": verify_modules(),
        "Device Detection": verify_device_detection(),
        "Service Initialization": verify_initialization(),
        "File Structure": verify_files(),
        "Test Files": verify_tests(),
        "Documentation": verify_documentation(),
    }
    
    return print_summary(results)


if __name__ == "__main__":
    sys.exit(main())

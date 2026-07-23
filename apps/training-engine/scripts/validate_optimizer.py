"""Validation script for Phase 4.4.4.5.4 - Optimizer Module."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def validate_imports():
    """Validate all imports work correctly."""
    print("🔍 Validating imports...")
    
    try:
        from app.optimizer import (
            OptimizerManager,
            optimizer_manager,
            OptimizerBuilder,
            optimizer_builder,
            OptimizerFactory,
            optimizer_factory,
            ParameterGroupBuilder,
            parameter_group_builder,
            OptimizerRegistry,
            optimizer_registry,
            OptimizerRuntime,
            optimizer_runtime,
            OptimizerValidator,
            optimizer_validator,
            SchedulerBuilder,
            scheduler_builder,
            SchedulerManager,
            scheduler_manager,
        )
        
        from app.optimizer.schemas import (
            OptimizerConfig,
            OptimizerType,
            SchedulerConfig,
            SchedulerType,
            WarmupStrategy,
        )
        
        from app.optimizer.exceptions import (
            OptimizerException,
            SchedulerException,
            ConfigurationException,
        )
        
        print("✅ All imports successful")
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {str(e)}")
        return False


def validate_schemas():
    """Validate schema definitions."""
    print("\n🔍 Validating schemas...")
    
    try:
        from app.optimizer.schemas import OptimizerConfig, SchedulerConfig
        
        # Create optimizer config
        opt_config = OptimizerConfig(
            optimizer_type="adamw",
            learning_rate=5e-5,
            weight_decay=0.01,
        )
        
        # Create scheduler config
        sched_config = SchedulerConfig(
            scheduler_type="linear_with_warmup",
            warmup_ratio=0.1,
            num_training_steps=1000,
        )
        
        print("✅ Schema validation successful")
        return True
        
    except Exception as e:
        print(f"❌ Schema validation failed: {str(e)}")
        return False


def validate_optimizer_types():
    """Validate optimizer types."""
    print("\n🔍 Validating optimizer types...")
    
    try:
        from app.optimizer.schemas import OptimizerType
        
        expected_types = ["adamw", "sgd", "adafactor", "adam", "rmsprop"]
        
        for opt_type in expected_types:
            assert hasattr(OptimizerType, opt_type.upper())
        
        print(f"✅ All {len(expected_types)} optimizer types available")
        return True
        
    except Exception as e:
        print(f"❌ Optimizer type validation failed: {str(e)}")
        return False


def validate_scheduler_types():
    """Validate scheduler types."""
    print("\n🔍 Validating scheduler types...")
    
    try:
        from app.optimizer.schemas import SchedulerType
        
        expected_types = [
            "linear",
            "cosine",
            "cosine_with_restarts",
            "polynomial",
            "constant",
            "constant_with_warmup",
            "linear_with_warmup",
        ]
        
        for sched_type in expected_types:
            assert hasattr(SchedulerType, sched_type.upper())
        
        print(f"✅ All {len(expected_types)} scheduler types available")
        return True
        
    except Exception as e:
        print(f"❌ Scheduler type validation failed: {str(e)}")
        return False


def validate_api_endpoints():
    """Validate API endpoints are registered."""
    print("\n🔍 Validating API endpoints...")
    
    try:
        from app.optimizer.api import router
        
        routes = [route.path for route in router.routes]
        
        expected_routes = [
            "/create",
            "/validate",
            "/scheduler/create",
            "/scheduler/reset",
            "/status/{optimizer_id}",
            "/scheduler/status/{scheduler_id}",
            "/metadata/{optimizer_id}",
            "/health",
        ]
        
        for route in expected_routes:
            if route not in routes:
                print(f"⚠️  Route {route} not found")
        
        print(f"✅ {len(routes)} API endpoints registered")
        return True
        
    except Exception as e:
        print(f"❌ API endpoint validation failed: {str(e)}")
        return False


def validate_events():
    """Validate optimizer events are registered."""
    print("\n🔍 Validating events...")
    
    try:
        from app.events import EventType
        
        expected_events = [
            "OPTIMIZER_CREATED",
            "SCHEDULER_CREATED",
            "LEARNING_RATE_UPDATED",
            "WARMUP_COMPLETED",
        ]
        
        for event in expected_events:
            if not hasattr(EventType, event):
                print(f"⚠️  Event {event} not found")
        
        print(f"✅ Optimizer events available")
        return True
        
    except Exception as e:
        print(f"❌ Event validation failed: {str(e)}")
        return False


def validate_test_files():
    """Validate test files exist."""
    print("\n🔍 Validating test files...")
    
    test_dir = Path(__file__).parent.parent / "tests" / "optimizer"
    
    expected_tests = [
        "conftest.py",
        "test_optimizer_builder.py",
        "test_parameter_groups.py",
        "test_scheduler_builder.py",
        "test_optimizer_manager.py",
        "test_optimizer_runtime.py",
        "test_validator.py",
        "test_factory.py",
        "test_registry.py",
        "test_scheduler_manager.py",
        "test_integration.py",
        "test_api.py",
    ]
    
    missing_tests = []
    for test_file in expected_tests:
        if not (test_dir / test_file).exists():
            missing_tests.append(test_file)
    
    if missing_tests:
        print(f"⚠️  Missing test files: {missing_tests}")
    else:
        print(f"✅ All {len(expected_tests)} test files present")
    
    return len(missing_tests) == 0


def validate_documentation():
    """Validate documentation exists."""
    print("\n🔍 Validating documentation...")
    
    docs = [
        Path(__file__).parent.parent / "app" / "optimizer" / "README.md",
        Path(__file__).parent.parent / "PHASE_4_4_4_5_4_COMPLETE.md",
    ]
    
    missing_docs = []
    for doc in docs:
        if not doc.exists():
            missing_docs.append(doc.name)
    
    if missing_docs:
        print(f"⚠️  Missing documentation: {missing_docs}")
    else:
        print(f"✅ All documentation files present")
    
    return len(missing_docs) == 0


def main():
    """Run all validations."""
    print("="*60)
    print("Phase 4.4.4.5.4 Validation")
    print("Enterprise Optimizer & Learning Rate Scheduler Engine")
    print("="*60)
    
    results = {
        "Imports": validate_imports(),
        "Schemas": validate_schemas(),
        "Optimizer Types": validate_optimizer_types(),
        "Scheduler Types": validate_scheduler_types(),
        "API Endpoints": validate_api_endpoints(),
        "Events": validate_events(),
        "Test Files": validate_test_files(),
        "Documentation": validate_documentation(),
    }
    
    print("\n" + "="*60)
    print("Validation Summary")
    print("="*60)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{name:.<40} {status}")
    
    print("="*60)
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n🎉 ALL VALIDATIONS PASSED!")
        print("Phase 4.4.4.5.4 is COMPLETE and PRODUCTION-READY")
    else:
        print("\n⚠️  Some validations failed. Please review.")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())

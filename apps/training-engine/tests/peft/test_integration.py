"""Integration tests for PEFT system."""

import pytest
import torch.nn as nn
from peft import PeftModel

from app.peft import (
    adapter_manager,
    adapter_runtime,
    lora_builder,
    peft_factory,
    peft_manager,
    peft_validator,
    target_module_detector,
)
from app.peft.schemas import AdapterType, CreatePEFTRequest, LoRAConfigRequest, TaskType


class IntegrationTestModel(nn.Module):
    """Model for integration testing."""

    def __init__(self):
        super().__init__()
        self.q_proj = nn.Linear(256, 256)
        self.k_proj = nn.Linear(256, 256)
        self.v_proj = nn.Linear(256, 256)
        self.o_proj = nn.Linear(256, 256)
        self.fc1 = nn.Linear(256, 1024)
        self.fc2 = nn.Linear(1024, 256)

    def forward(self, x):
        return self.fc2(self.fc1(self.o_proj(self.v_proj(x))))


@pytest.fixture
def integration_model():
    """Create integration test model."""
    return IntegrationTestModel()


@pytest.mark.integration
class TestPEFTIntegration:
    """Integration tests for complete PEFT workflow."""

    def test_full_workflow_with_factory(self, integration_model):
        """Test complete workflow using PEFT factory."""
        # 1. Validate environment
        assert peft_validator.validate_environment()

        # 2. Validate model
        assert peft_validator.validate_model(integration_model)

        # 3. Auto-detect modules
        detected = target_module_detector.auto_detect_target_modules(
            integration_model
        )
        assert len(detected) > 0

        # 4. Create adapter using factory
        peft_model, metadata = peft_factory.create_lora(
            model=integration_model,
            model_id="integration-test",
            rank=8,
            alpha=16,
            target_modules=detected[:2],  # Use first 2 detected
        )

        # 5. Verify PEFT model
        assert isinstance(peft_model, PeftModel)

        # 6. Verify metadata
        assert metadata["adapter_id"] is not None
        assert metadata["trainable_params"] > 0
        assert metadata["trainable_percent"] < 100.0

        # 7. Verify adapter was registered
        adapters = adapter_manager.list_adapters(model_id="integration-test")
        assert len(adapters) > 0

    def test_full_workflow_with_manager(self, integration_model):
        """Test complete workflow using PEFT manager."""
        # 1. Create request
        request = CreatePEFTRequest(
            model_id="integration-test-2",
            adapter_type=AdapterType.LORA,
            adapter_name="test-integration-adapter",
            lora_config=LoRAConfigRequest(
                r=4,
                lora_alpha=8,
                lora_dropout=0.1,
                target_modules=["q_proj", "v_proj"],
                task_type=TaskType.CAUSAL_LM,
            ),
        )

        # 2. Create adapter
        peft_model, metadata = peft_manager.create_adapter(
            integration_model, request
        )

        # 3. Verify creation
        assert isinstance(peft_model, PeftModel)
        assert metadata.adapter_name == "test-integration-adapter"

        # 4. Get adapter info
        adapter_info = peft_manager.get_adapter_info(metadata.adapter_id)
        assert adapter_info["adapter_id"] == metadata.adapter_id

        # 5. List adapters
        adapters = peft_manager.list_adapters(model_id="integration-test-2")
        assert len(adapters) > 0

        # 6. Check runtime
        is_active = adapter_runtime.is_adapter_active(metadata.adapter_id)
        assert is_active

    def test_workflow_with_validation(self, integration_model):
        """Test workflow with explicit validation."""
        # 1. Validate before creating
        config = {
            "r": 16,
            "lora_alpha": 32,
            "lora_dropout": 0.1,
            "target_modules": ["q_proj", "k_proj", "v_proj"],
        }

        validation_report = peft_validator.get_validation_report(
            integration_model, config
        )

        assert validation_report["valid"]
        assert validation_report["model_compatible"]

        # 2. Create adapter after validation
        request = CreatePEFTRequest(
            model_id="integration-test-3",
            adapter_type=AdapterType.LORA,
            lora_config=LoRAConfigRequest(**config),
        )

        peft_model, metadata = peft_manager.create_adapter(
            integration_model, request
        )

        # 3. Verify creation
        assert isinstance(peft_model, PeftModel)
        assert metadata.rank == 16

    def test_multiple_adapters_same_model(self, integration_model):
        """Test creating multiple adapters for same model."""
        model_id = "integration-test-multi"

        # Create first adapter
        peft_model_1, metadata_1 = peft_factory.create_lora(
            model=integration_model,
            model_id=model_id,
            rank=4,
            alpha=8,
            adapter_name="adapter-1",
        )

        # Create second adapter
        peft_model_2, metadata_2 = peft_factory.create_lora(
            model=integration_model,
            model_id=model_id,
            rank=8,
            alpha=16,
            adapter_name="adapter-2",
        )

        # Verify both exist
        adapters = adapter_manager.list_adapters(model_id=model_id)
        assert len(adapters) >= 2

        # Verify they're different
        assert metadata_1["adapter_id"] != metadata_2["adapter_id"]
        assert metadata_1["rank"] != metadata_2["rank"]

    def test_adapter_lifecycle(self, integration_model):
        """Test complete adapter lifecycle."""
        model_id = "integration-test-lifecycle"

        # 1. Create
        peft_model, metadata = peft_factory.create_lora_preset(
            model=integration_model,
            model_id=model_id,
            preset="balanced",
            adapter_name="lifecycle-adapter",
        )

        adapter_id = metadata["adapter_id"]

        # 2. Verify registered
        assert adapter_manager.get_adapter(adapter_id) is not None

        # 3. Check active
        assert adapter_runtime.is_adapter_active(adapter_id)

        # 4. Get summary
        summary = adapter_runtime.get_adapter_summary(adapter_id)
        assert summary["adapter_id"] == adapter_id
        assert summary["is_active"]

        # 5. Get metadata
        metadata_retrieved = adapter_runtime.get_metadata(adapter_id)
        assert metadata_retrieved["adapter_id"] == adapter_id

    def test_target_module_recommendations(self, integration_model):
        """Test target module detection and recommendations."""
        # 1. Get stats
        stats = target_module_detector.get_module_stats(integration_model)
        assert stats["total_modules"] > 0
        assert stats["linear_modules"] > 0

        # 2. Get recommendations for different efficiencies
        for efficiency in ["fast", "balanced", "quality"]:
            recommended = target_module_detector.recommend_target_modules(
                integration_model, efficiency=efficiency
            )

            assert "recommended" in recommended
            assert len(recommended["recommended"]) > 0
            assert recommended["efficiency"] == efficiency

    def test_preset_configurations(self, integration_model):
        """Test all preset configurations."""
        model_id = "integration-test-presets"

        presets = ["fast", "balanced", "quality"]

        for preset in presets:
            peft_model, metadata = peft_factory.create_lora_preset(
                model=integration_model,
                model_id=model_id,
                preset=preset,
                adapter_name=f"adapter-{preset}",
            )

            # Verify creation
            assert isinstance(peft_model, PeftModel)
            assert metadata["adapter_name"] == f"adapter-{preset}"

            # Verify different configs
            if preset == "fast":
                assert metadata["rank"] <= 8
            elif preset == "balanced":
                assert 8 <= metadata["rank"] <= 32
            elif preset == "quality":
                assert metadata["rank"] >= 32

    def test_validation_catches_errors(self, integration_model):
        """Test that validation catches configuration errors."""
        # Invalid rank
        invalid_config = {
            "r": -1,  # Invalid
            "lora_alpha": 16,
            "target_modules": ["q_proj"],
        }

        report = peft_validator.get_validation_report(
            integration_model, invalid_config
        )

        assert not report["valid"]
        assert len(report["issues"]) > 0

    def test_factory_model_size_optimization(self, integration_model):
        """Test factory model size optimization."""
        model_id = "integration-test-sizes"

        sizes = ["small", "base", "large", "xlarge"]

        for size in sizes:
            peft_model, metadata = peft_factory.create_lora_for_model_size(
                model=integration_model,
                model_id=model_id,
                model_size=size,
                adapter_name=f"adapter-{size}",
            )

            # Verify creation
            assert isinstance(peft_model, PeftModel)

            # Verify rank increases with size
            if size == "small":
                assert metadata["rank"] <= 16
            elif size == "large":
                assert metadata["rank"] >= 16
            elif size == "xlarge":
                assert metadata["rank"] >= 32


@pytest.mark.integration
class TestPEFTRuntimeIntegration:
    """Integration tests for PEFT runtime operations."""

    def test_runtime_stats(self, integration_model):
        """Test runtime statistics."""
        # Create some adapters
        for i in range(3):
            peft_factory.create_lora(
                model=integration_model,
                model_id=f"model-{i}",
                rank=8,
                alpha=16,
                adapter_name=f"adapter-{i}",
            )

        # Get stats
        stats = adapter_runtime.get_runtime_stats()

        assert stats["total_adapters"] >= 3
        assert "active_adapters" in stats

    def test_list_and_filter(self, integration_model):
        """Test listing and filtering adapters."""
        model_id = "filter-test-model"

        # Create adapters
        peft_factory.create_lora(
            integration_model, model_id, rank=8, adapter_name="lora-1"
        )
        peft_factory.create_lora(
            integration_model, model_id, rank=16, adapter_name="lora-2"
        )

        # List all
        all_adapters = adapter_runtime.list_adapters()
        assert len(all_adapters) > 0

        # Filter by model
        model_adapters = adapter_runtime.list_adapters(model_id=model_id)
        assert len(model_adapters) >= 2

        # Filter active only
        active_adapters = adapter_runtime.list_adapters(active_only=True)
        assert len(active_adapters) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "integration"])

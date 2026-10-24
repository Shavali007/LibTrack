package com.libtrack.circulation;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
public record RequestDecisionInput(@NotNull RequestDecision decision,@Size(max=1000) String reason){}

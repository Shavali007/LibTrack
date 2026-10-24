package com.libtrack.circulation;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
public record ReturnRequest(@NotNull ReturnCondition condition,@Size(max=1000) String note){}

package com.libtrack.circulation;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
public record IssueRequest(@NotNull java.util.UUID copyId,@Size(max=1000) String note){}

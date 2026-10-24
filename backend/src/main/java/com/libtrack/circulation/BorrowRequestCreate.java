package com.libtrack.circulation;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
public record BorrowRequestCreate(@NotNull UUID bookId){}

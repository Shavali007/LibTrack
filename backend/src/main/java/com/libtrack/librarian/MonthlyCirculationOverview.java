package com.libtrack.librarian;

public record MonthlyCirculationOverview(
    String month,
    int year,
    long issued,
    long returned
) {}

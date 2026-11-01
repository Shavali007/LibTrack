package com.libtrack.circulation;

import java.time.Clock;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

@Service
public class AcademicSemesterService {
    private final AcademicSemesterRepository semesters;
    private final Clock clock;

    public AcademicSemesterService(AcademicSemesterRepository semesters, Clock clock) {
        this.semesters = semesters;
        this.clock = clock;
    }

    public AcademicSemester getCurrentSemester() {
        return getSemesterForDate(LocalDate.now(clock));
    }

    public AcademicSemester getSemesterForDate(LocalDate date) {
        return semesters.findByDate(date)
                .orElseGet(() -> fallbackSemester(date));
    }

    private AcademicSemester fallbackSemester(LocalDate date) {
        int year = date.getYear();
        if (date.getMonthValue() <= 6) {
            return new AcademicSemester("SPRING-" + year, "Spring " + year, LocalDate.of(year, 1, 1), LocalDate.of(year, 6, 30));
        } else {
            return new AcademicSemester("FALL-" + year, "Fall " + year, LocalDate.of(year, 7, 1), LocalDate.of(year, 12, 31));
        }
    }
}

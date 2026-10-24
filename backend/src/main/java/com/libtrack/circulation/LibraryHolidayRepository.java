package com.libtrack.circulation;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface LibraryHolidayRepository extends JpaRepository<LibraryHoliday,UUID>{
 boolean existsByHolidayDate(LocalDate holidayDate);
 Optional<LibraryHoliday> findByHolidayDate(LocalDate holidayDate);
 List<LibraryHoliday> findAllByOrderByHolidayDateAsc();
}

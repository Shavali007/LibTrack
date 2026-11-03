package com.libtrack.circulation;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LibraryHolidayRepository extends JpaRepository<LibraryHoliday, UUID> {

    @Query("SELECT CASE WHEN COUNT(h) > 0 THEN true ELSE false END FROM LibraryHoliday h WHERE h.fromDate <= :date AND h.toDate >= :date")
    boolean isLibraryHoliday(@Param("date") LocalDate date);

    default boolean existsByHolidayDate(LocalDate holidayDate) {
        return isLibraryHoliday(holidayDate);
    }

    @Query("SELECT h FROM LibraryHoliday h WHERE h.fromDate <= :date AND h.toDate >= :date")
    List<LibraryHoliday> findHolidaysOnDate(@Param("date") LocalDate date);

    default Optional<LibraryHoliday> findByHolidayDate(LocalDate holidayDate) {
        List<LibraryHoliday> list = findHolidaysOnDate(holidayDate);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Query("SELECT h FROM LibraryHoliday h WHERE h.fromDate <= :toDate AND h.toDate >= :fromDate")
    List<LibraryHoliday> findOverlappingHolidays(@Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);

    @Query("SELECT h FROM LibraryHoliday h WHERE h.id <> :id AND h.fromDate <= :toDate AND h.toDate >= :fromDate")
    List<LibraryHoliday> findOverlappingHolidaysExcludingId(@Param("id") UUID id, @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);

    List<LibraryHoliday> findAllByOrderByFromDateAsc();

    default List<LibraryHoliday> findAllByOrderByHolidayDateAsc() {
        return findAllByOrderByFromDateAsc();
    }
}

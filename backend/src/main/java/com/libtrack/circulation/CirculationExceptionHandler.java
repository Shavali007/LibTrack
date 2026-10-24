package com.libtrack.circulation;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
@RestControllerAdvice
public class CirculationExceptionHandler {
 @ExceptionHandler(CirculationConflictException.class) ResponseEntity<ErrorBody> conflict(CirculationConflictException e){return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorBody("CIRCULATION_CONFLICT",e.getMessage()));}
 @ExceptionHandler(CirculationNotFoundException.class) ResponseEntity<ErrorBody> missing(CirculationNotFoundException e){return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorBody("CIRCULATION_NOT_FOUND",e.getMessage()));}
 @ExceptionHandler(LibraryCalendarConfigurationException.class) ResponseEntity<ErrorBody> calendar(LibraryCalendarConfigurationException e){return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new ErrorBody("HOLIDAY_CALENDAR_CONFIGURATION",e.getMessage()));}
 @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<ErrorBody> invalid(IllegalArgumentException e){return ResponseEntity.badRequest().body(new ErrorBody("INVALID_CIRCULATION_QUERY",e.getMessage()));}
 public record ErrorBody(String code,String message){}
}

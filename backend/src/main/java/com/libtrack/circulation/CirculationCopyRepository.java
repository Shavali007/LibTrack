package com.libtrack.circulation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import com.libtrack.catalogue.CopyStatus;
public interface CirculationCopyRepository extends JpaRepository<com.libtrack.catalogue.BookCopy,UUID>{
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from BookCopy c where c.id=:id") Optional<com.libtrack.catalogue.BookCopy> findByIdForUpdate(@Param("id") UUID id);
 boolean existsByIdAndStatus(UUID id,CopyStatus status);
}

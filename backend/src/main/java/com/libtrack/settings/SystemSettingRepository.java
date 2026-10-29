package com.libtrack.settings;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {
    @Query("select s from SystemSetting s left join fetch s.updatedBy order by s.settingKey asc")
    List<SystemSetting> findAllWithUpdater();
}

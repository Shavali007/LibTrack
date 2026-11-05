package com.libtrack.settings;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ExceptionHandler;

import com.libtrack.auth.AccountUserDetails;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/librarian/settings")
@PreAuthorize("hasRole('LIBRARIAN')")
public class SystemSettingController {
    private final SystemSettingService settingService;

    public SystemSettingController(SystemSettingService settingService) {
        this.settingService = settingService;
    }

    private static UUID accountId(Authentication auth) {
        return ((AccountUserDetails) auth.getPrincipal()).getId();
    }

    @GetMapping
    public ResponseEntity<List<SettingRecord>> getAllSettings() {
        return ResponseEntity.ok(settingService.getAllSettings());
    }

    @GetMapping("/library-info")
    public ResponseEntity<LibraryInfoRecord> getLibraryInfo() {
        return ResponseEntity.ok(settingService.getLibraryInfo());
    }

    @PutMapping("/library-info")
    public ResponseEntity<LibraryInfoRecord> updateLibraryInfo(@Valid @RequestBody LibraryInfoRecord request,
                                                               Authentication auth) {
        return ResponseEntity.ok(settingService.updateLibraryInfo(request, accountId(auth)));
    }

    @PutMapping("/{key}")
    public ResponseEntity<SettingRecord> updateSetting(@PathVariable String key,
                                                       @Valid @RequestBody UpdateSettingRequest request,
                                                       Authentication auth) {
        return ResponseEntity.ok(settingService.updateSetting(key, request.value(), accountId(auth)));
    }

    @PutMapping("/fine-policy")
    public ResponseEntity<Void> updateFinePolicy(@Valid @RequestBody FinePolicyUpdateRequest request,
                                                  Authentication auth) {
        settingService.updateFinePolicy(request.toPolicy(), accountId(auth));
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalidSetting(IllegalArgumentException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "INVALID_SETTING", "message", exception.getMessage()));
    }
}

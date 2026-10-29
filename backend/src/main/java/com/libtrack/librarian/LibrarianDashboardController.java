package com.libtrack.librarian;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/librarian/dashboard")
public class LibrarianDashboardController {
    private final LibrarianDashboardService dashboardService;

    public LibrarianDashboardController(LibrarianDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public DashboardStatsResponse getStats() {
        return dashboardService.getStats();
    }

    @GetMapping("/overview")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public List<MonthlyCirculationOverview> getCirculationOverview(
            @RequestParam(defaultValue = "5") int months) {
        return dashboardService.getCirculationOverview(months);
    }

    @GetMapping("/recent-activity")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public List<RecentActivityItem> getRecentActivity(
            @RequestParam(defaultValue = "5") int limit) {
        return dashboardService.getRecentActivity(limit);
    }
}

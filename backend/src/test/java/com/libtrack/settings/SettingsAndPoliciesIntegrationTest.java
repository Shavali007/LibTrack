package com.libtrack.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.AccountUserDetails;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.circulation.LibraryHoliday;
import com.libtrack.circulation.LibraryHolidayRepository;

@LibTrackIntegrationTest
@Transactional
class SettingsAndPoliciesIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UserAccountRepository accounts;

    @Autowired
    private LibraryHolidayRepository holidayRepository;

    private final ObjectMapper mapper = new ObjectMapper();

    private UserAccount librarian;
    private UserAccount student;
    private UserAccount faculty;

    @BeforeEach
    void setUp() {
        librarian = accounts.save(UserAccount.initialLibrarian("librarian.settings@vitap.ac.in", "hash123"));
        student = accounts.save(UserAccount.provisionMember(
                "student.settings@vitapstudent.ac.in",
                "hash123",
                AccountRole.STUDENT,
                "23MIC9999",
                librarian.getId(),
                java.time.Instant.now()
        ));
        faculty = accounts.save(UserAccount.provisionMember(
                "faculty.settings@vitap.ac.in",
                "hash123",
                AccountRole.FACULTY,
                "FAC9999",
                librarian.getId(),
                java.time.Instant.now()
        ));
    }

    @Test
    void libraryInfoReturnsDefaultDetailsAndAllowsLibrarianUpdate() throws Exception {
        mvc.perform(get("/api/v1/librarian/settings/library-info")
                        .with(user(new AccountUserDetails(librarian))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.libraryName").value("VIT-AP Central Library"))
                .andExpect(jsonPath("$.contactEmail").value("library@vitap.ac.in"))
                .andExpect(jsonPath("$.contactPhone").value("+91 86323 45678"))
                .andExpect(jsonPath("$.address").value("VIT-AP University, Inavolu, Guntur - 522237"))
                .andExpect(jsonPath("$.openTime").value("09:00 AM"))
                .andExpect(jsonPath("$.closeTime").value("06:00 PM"));

        // Validation test: invalid email rejects with 400
        LibraryInfoRecord invalidReq = new LibraryInfoRecord(
                "Updated Library",
                "not-an-email",
                "+91 1234567890",
                "Campus Address",
                "08:00 AM",
                "08:00 PM"
        );
        mvc.perform(put("/api/v1/librarian/settings/library-info")
                        .with(user(new AccountUserDetails(librarian)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest());

        // Valid update succeeds and persists
        LibraryInfoRecord validReq = new LibraryInfoRecord(
                "VIT-AP Central Library Updated",
                "central.library@vitap.ac.in",
                "+91 99999 88888",
                "Academic Block 1, VIT-AP University, Inavolu, Guntur - 522237",
                "08:30 AM",
                "07:30 PM"
        );
        mvc.perform(put("/api/v1/librarian/settings/library-info")
                        .with(user(new AccountUserDetails(librarian)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(validReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.libraryName").value("VIT-AP Central Library Updated"))
                .andExpect(jsonPath("$.contactEmail").value("central.library@vitap.ac.in"))
                .andExpect(jsonPath("$.contactPhone").value("+91 99999 88888"))
                .andExpect(jsonPath("$.openTime").value("08:30 AM"))
                .andExpect(jsonPath("$.closeTime").value("07:30 PM"));

        // Student cannot access or update library info
        mvc.perform(get("/api/v1/librarian/settings/library-info")
                        .with(user(new AccountUserDetails(student))))
                .andExpect(status().isForbidden());
    }

    @Test
    void policiesAreReadOnlyAndRejectModifications() throws Exception {
        // 1. Librarian can view policies
        mvc.perform(get("/api/v1/policies")
                        .with(user(new AccountUserDetails(librarian))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.borrowing.studentMaxBooks").value(5))
                .andExpect(jsonPath("$.borrowing.facultyMaxBooks").value(5))
                .andExpect(jsonPath("$.renewal.maxRenewals").value("1 per semester"))
                .andExpect(jsonPath("$.fines.overdueFinePerDay").value("₹10"))
                .andExpect(jsonPath("$.membership.eligibleMembers").value("Students and Faculty of VIT-AP"))
                .andExpect(jsonPath("$.usageGuidelines").isArray());

        // 2. Student can view policies with identical values
        mvc.perform(get("/api/v1/policies")
                        .with(user(new AccountUserDetails(student))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.borrowing.studentMaxBooks").value(5))
                .andExpect(jsonPath("$.borrowing.facultyMaxBooks").value(5))
                .andExpect(jsonPath("$.renewal.maxRenewals").value("1 per semester"))
                .andExpect(jsonPath("$.fines.overdueFinePerDay").value("₹10"))
                .andExpect(jsonPath("$.membership.eligibleMembers").value("Students and Faculty of VIT-AP"))
                .andExpect(jsonPath("$.usageGuidelines").isArray());

        // 3. Faculty can view policies with identical values
        mvc.perform(get("/api/v1/policies")
                        .with(user(new AccountUserDetails(faculty))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.borrowing.studentMaxBooks").value(5))
                .andExpect(jsonPath("$.borrowing.facultyMaxBooks").value(5))
                .andExpect(jsonPath("$.renewal.maxRenewals").value("1 per semester"))
                .andExpect(jsonPath("$.fines.overdueFinePerDay").value("₹10"))
                .andExpect(jsonPath("$.membership.eligibleMembers").value("Students and Faculty of VIT-AP"))
                .andExpect(jsonPath("$.usageGuidelines").isArray());

        // Modification attempts are rejected with 405 Method Not Allowed for all roles
        mvc.perform(put("/api/v1/policies")
                        .with(user(new AccountUserDetails(librarian)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"borrowing\":{}}"))
                .andExpect(status().isMethodNotAllowed());

        mvc.perform(post("/api/v1/policies")
                        .with(user(new AccountUserDetails(student)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"borrowing\":{}}"))
                .andExpect(status().isMethodNotAllowed());

        mvc.perform(delete("/api/v1/policies")
                        .with(user(new AccountUserDetails(faculty)))
                        .with(csrf()))
                .andExpect(status().isMethodNotAllowed());

        // Student and Faculty are blocked from librarian-only settings endpoints
        mvc.perform(get("/api/v1/librarian/settings/library-info")
                        .with(user(new AccountUserDetails(faculty))))
                .andExpect(status().isForbidden());
    }

    @Test
    void holidayCrudOperationsAndConflictValidation() throws Exception {
        LocalDate hDate = LocalDate.of(2027, 1, 15);
        LocalDate hDate2 = LocalDate.of(2027, 1, 16);

        // Create holiday
        String resJson = mvc.perform(post("/api/v1/holidays")
                        .with(user(new AccountUserDetails(librarian)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "holidayDate", hDate.toString(),
                                "name", "Pongal Holiday"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.holidayDate").value(hDate.toString()))
                .andExpect(jsonPath("$.name").value("Pongal Holiday"))
                .andReturn().getResponse().getContentAsString();

        String holidayId = mapper.readTree(resJson).get("id").asText();

        // Duplicate date causes 409 Conflict
        mvc.perform(post("/api/v1/holidays")
                        .with(user(new AccountUserDetails(librarian)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "holidayDate", hDate.toString(),
                                "name", "Duplicate Pongal"
                        ))))
                .andExpect(status().isConflict());

        // Update holiday name
        mvc.perform(put("/api/v1/holidays/" + holidayId)
                        .with(user(new AccountUserDetails(librarian)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "holidayDate", hDate2.toString(),
                                "name", "Pongal Holiday Extended"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.holidayDate").value(hDate2.toString()))
                .andExpect(jsonPath("$.name").value("Pongal Holiday Extended"));

        // Delete holiday
        mvc.perform(delete("/api/v1/holidays/" + holidayId)
                        .with(user(new AccountUserDetails(librarian)))
                        .with(csrf()))
                .andExpect(status().isNoContent());

        assertThat(holidayRepository.existsById(UUID.fromString(holidayId))).isFalse();

        // Student cannot create holidays
        mvc.perform(post("/api/v1/holidays")
                        .with(user(new AccountUserDetails(student)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "holidayDate", hDate.toString(),
                                "name", "Student Attempt"
                        ))))
                .andExpect(status().isForbidden());
    }
}

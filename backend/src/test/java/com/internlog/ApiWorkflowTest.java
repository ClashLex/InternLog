package com.internlog;

import com.internlog.dto.AuthDtos.*;
import com.internlog.model.*;
import com.internlog.repository.*;
import com.internlog.security.JwtUtil;
import com.internlog.service.*;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ApiWorkflowTest {
  @Autowired MockMvc mvc;
  @Autowired UserService userService;
  @Autowired CompanyService companyService;
  @Autowired InternshipRepository internships;
  @Autowired ApplicationRepository applications;
  @Autowired SavedSearchRepository searches;
  @Autowired JwtUtil jwt;
  @Autowired AuthService auth;
  User student, otherStudent;
  Company company, otherCompany;
  Internship job;
  String studentToken, companyToken, adminToken;

  @BeforeEach
  void setup() {
    student = userService.register(new RegisterUserRequest("Student", "student@test.example", "Password123", "College", "CS", "2027"));
    otherStudent = userService.register(new RegisterUserRequest("Other", "other@test.example", "Password123", "College", "CS", "2027"));
    company = companyService.register(new RegisterCompanyRequest("Company", "hr@test.example", "Password123", "https://example.com", "Remote", "Software", "A company"));
    otherCompany = companyService.register(new RegisterCompanyRequest("Other company", "other-hr@test.example", "Password123", null, "Remote", null, null));
    companyService.setStatus(company.getId(), "Active");
    companyService.setStatus(otherCompany.getId(), "Active");
    job = new Internship();
    job.setCompany(company); job.setCompanyName(company.getName()); job.setTitle("Developer intern");
    job.setLocation("Remote"); job.setType("Remote"); job.setDeadline(LocalDate.now().plusDays(10));
    job.setStatus(InternshipStatus.Published); internships.saveAndFlush(job);
    studentToken = jwt.issue("user", student.getId(), student.getEmail());
    companyToken = jwt.issue("company", company.getId(), company.getEmail());
    adminToken = jwt.issue("admin", 0L, "admin@test.example");
  }

  @Test
  void publicBoardButPrivateManagement() throws Exception {
    mvc.perform(get("/")).andExpect(status().isOk());
    mvc.perform(get("/js/api.js")).andExpect(status().isOk());
    mvc.perform(get("/api/internships/board")).andExpect(status().isOk());
    mvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
    mvc.perform(delete("/api/internships/" + job.getId()).with(csrf())).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/admin/dashboard").header("Authorization", "Bearer " + studentToken)).andExpect(status().isForbidden());
    mvc.perform(get("/api/admin/dashboard").header("Authorization", "Bearer " + adminToken)).andExpect(status().isOk());
    mvc.perform(get("/api/users").header("Authorization", "Bearer invalid")).andExpect(status().isUnauthorized());
  }

  @Test
  void studentCannotReadOrModifyOtherAccounts() throws Exception {
    mvc.perform(get("/api/users/" + otherStudent.getId()).header("Authorization", "Bearer " + studentToken)).andExpect(status().isForbidden());
    mvc.perform(get("/api/applications").param("userId", otherStudent.getId().toString()).header("Authorization", "Bearer " + studentToken)).andExpect(status().isForbidden());
    mvc.perform(put("/api/users/" + student.getId()).header("Authorization", "Bearer " + studentToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"Disabled\"}")).andExpect(status().isForbidden());
  }

  @Test
  void companyCannotModerateOrEditOtherCompanyJobs() throws Exception {
    String otherToken = jwt.issue("company", otherCompany.getId(), otherCompany.getEmail());
    mvc.perform(put("/api/internships/" + job.getId()).header("Authorization", "Bearer " + otherToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Hijacked\"}")).andExpect(status().isForbidden());
    mvc.perform(patch("/api/companies/" + company.getId() + "/status").header("Authorization", "Bearer " + companyToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"Active\"}")).andExpect(status().isForbidden());
    mvc.perform(patch("/api/internships/" + job.getId() + "/status").header("Authorization", "Bearer " + companyToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"Published\"}")).andExpect(status().isForbidden());
  }

  @Test
  void applyAndCompanyStatusWorkflow() throws Exception {
    mvc.perform(post("/api/internships/" + job.getId() + "/apply").param("userId", student.getId().toString())
        .header("Authorization", "Bearer " + studentToken)).andExpect(status().isOk()).andExpect(jsonPath("$.updatedAt").isNotEmpty());
    var app = applications.findByUserIdAndInternshipId(student.getId(), job.getId()).orElseThrow();
    mvc.perform(patch("/api/applications/" + app.getId() + "/status").header("Authorization", "Bearer " + companyToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"Shortlisted\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("Developer intern"));
    mvc.perform(post("/api/internships/" + job.getId() + "/apply").param("userId", student.getId().toString())
        .header("Authorization", "Bearer " + studentToken)).andExpect(status().isBadRequest());
    String otherToken = jwt.issue("company", otherCompany.getId(), otherCompany.getEmail());
    mvc.perform(get("/api/applications").header("Authorization", "Bearer " + otherToken)).andExpect(jsonPath("$").isEmpty());
    mvc.perform(get("/api/applications/" + app.getId()).header("Authorization", "Bearer " + otherToken)).andExpect(status().isForbidden());
  }

  @Test
  void expiredInternshipsCannotBeAppliedToEvenThroughGenericCreate() throws Exception {
    job.setDeadline(LocalDate.now().minusDays(1)); internships.saveAndFlush(job);
    mvc.perform(post("/api/internships/" + job.getId() + "/apply").param("userId", student.getId().toString())
        .header("Authorization", "Bearer " + studentToken)).andExpect(status().isBadRequest());
    mvc.perform(post("/api/applications").header("Authorization", "Bearer " + studentToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"userId\":" + student.getId() + ",\"internshipId\":" + job.getId() + "}"))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/internships/board")).andExpect(jsonPath("$").isEmpty());
  }

  @Test
  void suspendedCompaniesAreBlockedAndPostsRequireReviewOnRestore() throws Exception {
    companyService.setStatus(company.getId(), "Suspended");
    mvc.perform(get("/api/companies/" + company.getId()).header("Authorization", "Bearer " + companyToken)).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/internships/" + job.getId() + "/apply").param("userId", student.getId().toString())
        .header("Authorization", "Bearer " + studentToken)).andExpect(status().isBadRequest());
    companyService.setStatus(company.getId(), "Active");
    assertEquals(InternshipStatus.Pending_Review, internships.findById(job.getId()).orElseThrow().getStatus());
  }

  @Test
  void editingPublishedJobResubmitsWithoutResettingOtherFields() throws Exception {
    mvc.perform(put("/api/internships/" + job.getId()).header("Authorization", "Bearer " + companyToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Updated title\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("Pending Review"))
        .andExpect(jsonPath("$.internshipType").value("Remote"));
  }

  @Test
  void passwordChangeVerifiesCurrentPasswordAndUpdatesHash() throws Exception {
    mvc.perform(post("/api/users/" + student.getId() + "/password").header("Authorization", "Bearer " + studentToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"currentPassword\":\"wrong\",\"newPassword\":\"NewPassword123\"}"))
        .andExpect(status().isBadRequest());
    mvc.perform(post("/api/users/" + student.getId() + "/password").header("Authorization", "Bearer " + studentToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"currentPassword\":\"Password123\",\"newPassword\":\"NewPassword123\"}"))
        .andExpect(status().isOk());
    mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"student@test.example\",\"password\":\"NewPassword123\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.token").isNotEmpty());
  }

  @Test
  void deletingUserCascadesSavedSearchesAndApplications() throws Exception {
    SavedSearch search = new SavedSearch(); search.setUser(student); searches.saveAndFlush(search);
    Application app = new Application(); app.setUser(student); app.setCompanyName("Manual"); app.setRole("Intern");
    applications.saveAndFlush(app);
    mvc.perform(delete("/api/users/" + student.getId()).header("Authorization", "Bearer " + adminToken)).andExpect(status().isOk());
    searches.flush(); applications.flush();
    assertTrue(searches.findByUserId(student.getId()).isEmpty());
    assertTrue(applications.findByUserId(student.getId()).isEmpty());
  }

  @Test
  void oldDemoAdminCredentialsAreNotAcceptedByBackend() throws Exception {
    mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"admin@internlog.com\",\"password\":\"admin123\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void configuredAdminCredentialsIssueAnAdminToken() throws Exception {
    org.springframework.test.util.ReflectionTestUtils.setField(auth, "adminPasswordHash",
        new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("AdminPassword123"));
    try {
      mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
          .content("{\"email\":\"admin@test.example\",\"password\":\"AdminPassword123\"}"))
          .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("admin")).andExpect(jsonPath("$.token").isNotEmpty());
    } finally { org.springframework.test.util.ReflectionTestUtils.setField(auth, "adminPasswordHash", ""); }
  }

  @Test
  void profileEditsDoNotReactivateDisabledUsers() throws Exception {
    student.setStatus("Disabled");
    mvc.perform(put("/api/users/" + student.getId()).header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Updated student\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("Disabled"));
  }

  @Test
  void unsafeUrlsAndMalformedDatesReturnClientErrors() throws Exception {
    mvc.perform(post("/api/applications").header("Authorization", "Bearer " + studentToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"userId\":" + student.getId() + ",\"company\":\"Manual\",\"role\":\"Intern\",\"url\":\"javascript:alert(1)\"}"))
        .andExpect(status().isBadRequest());
    mvc.perform(post("/api/applications").header("Authorization", "Bearer " + studentToken)
        .contentType(MediaType.APPLICATION_JSON).content("{\"userId\":" + student.getId() + ",\"company\":\"Manual\",\"role\":\"Intern\",\"appliedDate\":\"bad\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void browserSessionSurvivesNavigationAndLogoutInvalidatesIt() throws Exception {
    var login = mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"student@test.example\",\"password\":\"Password123\"}"))
        .andExpect(status().isOk()).andReturn();
    var session = (org.springframework.mock.web.MockHttpSession) login.getRequest().getSession(false);
    assertNotNull(session);
    mvc.perform(get("/api/auth/session").session(session)).andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value(student.getId())).andExpect(jsonPath("$.token").doesNotExist());
    mvc.perform(get("/api/applications").session(session)).andExpect(status().isOk());
    mvc.perform(put("/api/users/" + student.getId()).session(session)
        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Updated\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isOk());
    assertTrue(session.isInvalid());
    mvc.perform(get("/api/auth/session")).andExpect(status().isUnauthorized());
  }

  @Test
  void preferencesArePersistedInDatabaseAndScopedToAuthenticatedAccount() throws Exception {
    mvc.perform(put("/api/preferences/savedInternships").header("Authorization", "Bearer " + studentToken)
        .contentType(MediaType.APPLICATION_JSON).content("[1,2]"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/preferences").header("Authorization", "Bearer " + studentToken))
        .andExpect(jsonPath("$.savedInternships[0]").value(1));
    String otherToken = jwt.issue("user", otherStudent.getId(), otherStudent.getEmail());
    mvc.perform(get("/api/preferences").header("Authorization", "Bearer " + otherToken))
        .andExpect(jsonPath("$.savedInternships").doesNotExist());
    mvc.perform(put("/api/preferences/adminName").header("Authorization", "Bearer " + studentToken)
        .contentType(MediaType.APPLICATION_JSON).content("\"Imposter\""))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ready"));
  }
}

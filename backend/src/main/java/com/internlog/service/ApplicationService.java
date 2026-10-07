package com.internlog.service;

import com.internlog.dto.ApplicationRequest;
import com.internlog.dto.AuthDtos.ApplicationResponse;
import com.internlog.model.Application;
import java.util.List;

public interface ApplicationService {
  Application create(ApplicationRequest req);
  Application applyToInternship(Long userId, Long internshipId);
  Application getById(Long id);
  List<Application> list(Long userId, String status, String query);
  List<Application> needsFollowup(Long userId);
  Application update(Long id, ApplicationRequest req);
  Application setStatus(Long id, String status);
  void delete(Long id);
  ApplicationResponse toResponse(Application app);
}

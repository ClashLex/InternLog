package com.internlog.service.impl;

import com.internlog.exception.NotFoundException;
import com.internlog.model.*;
import com.internlog.repository.*;
import com.internlog.service.AlertService;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AlertServiceImpl implements AlertService {

  private final SavedSearchRepository searches;
  private final UserRepository users;

  public AlertServiceImpl(SavedSearchRepository searches, UserRepository users) {
    this.searches = searches;
    this.users = users;
  }

  @Override
  @Transactional
  public SavedSearch save(Long userId, String query, String location, String type, Integer minStipend) {
    User user = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found."));
    SavedSearch search = new SavedSearch();
    search.setUser(user);
    search.setQuery(query != null ? query.trim() : "");
    search.setLocation(location != null ? location.trim() : "");
    search.setType(type != null ? type.trim() : "");
    search.setMinStipend(minStipend != null ? minStipend : 0);
    return searches.save(search);
  }

  @Override
  public List<SavedSearch> list(Long userId) {
    return searches.findByUserId(userId);
  }

  @Override
  @Transactional
  public void delete(Long id) {
    if (!searches.existsById(id)) throw new NotFoundException("Alert not found.");
    searches.deleteById(id);
  }

  @Override
  public boolean matches(Internship job, SavedSearch search) {
    if (job.getStatus() != InternshipStatus.Published) return false;
    String q = search.getQuery() == null ? "" : search.getQuery().toLowerCase().trim();
    if (!q.isEmpty()) {
      String hay = ((job.getTitle() == null ? "" : job.getTitle()) + " "
          + (job.getCompanyName() == null ? "" : job.getCompanyName()) + " "
          + (job.getLocation() == null ? "" : job.getLocation()) + " "
          + (job.getDescription() == null ? "" : job.getDescription()) + " "
          + (job.getSkillsCsv() == null ? "" : job.getSkillsCsv())).toLowerCase();
      if (!hay.contains(q)) return false;
    }
    String loc = search.getLocation() == null ? "" : search.getLocation().toLowerCase().trim();
    if (!loc.isEmpty() && (job.getLocation() == null || !job.getLocation().toLowerCase().contains(loc))) return false;
    if (search.getType() != null && !search.getType().isEmpty() && !"Any".equals(search.getType())
        && job.getType() != null && !search.getType().equals(job.getType())) return false;
    if (search.getMinStipend() != null && search.getMinStipend() > 0
        && (job.getStipend() == null || job.getStipend() < search.getMinStipend())) return false;
    return true;
  }

  @Override
  public List<Internship> matchesFor(Long userId, List<Internship> publishedJobs) {
    List<SavedSearch> all = list(userId);
    Set<Long> seen = new HashSet<>();
    List<Internship> out = new ArrayList<>();
    for (SavedSearch search : all) {
      for (Internship job : publishedJobs) {
        if (matches(job, search) && seen.add(job.getId())) out.add(job);
      }
    }
    return out.stream().collect(Collectors.toList());
  }
}

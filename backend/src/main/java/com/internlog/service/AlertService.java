package com.internlog.service;

import com.internlog.model.Internship;
import com.internlog.model.SavedSearch;
import java.util.List;

public interface AlertService {
  SavedSearch save(Long userId, String query, String location, String type, Integer minStipend);
  List<SavedSearch> list(Long userId);
  void delete(Long id);
  boolean matches(Internship job, SavedSearch search);
  List<Internship> matchesFor(Long userId, List<Internship> publishedJobs);
}

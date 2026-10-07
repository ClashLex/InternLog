package com.internlog.model;

import jakarta.persistence.*;
import java.time.Instant;

/** Saved job alert. Maps to `internlog_saved_searches` in the prototype. */
@Entity
@Table(name = "saved_searches")
public class SavedSearch {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  private String query = "";
  private String location = "";
  private String type = "";
  private Integer minStipend = 0;
  private Instant createdAt = Instant.now();

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public User getUser() { return user; }
  public void setUser(User user) { this.user = user; }
  public String getQuery() { return query; }
  public void setQuery(String query) { this.query = query; }
  public String getLocation() { return location; }
  public void setLocation(String location) { this.location = location; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public Integer getMinStipend() { return minStipend; }
  public void setMinStipend(Integer minStipend) { this.minStipend = minStipend; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}

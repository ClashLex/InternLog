package com.internlog.model;

import jakarta.persistence.*;

@Entity
@Table(name = "account_preferences", uniqueConstraints = @UniqueConstraint(
    name = "uk_account_preference", columnNames = {"account_role", "account_id", "preference_name"}))
public class AccountPreference {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(name = "account_role", nullable = false)
  private String accountRole;
  @Column(name = "account_id", nullable = false)
  private Long accountId;
  @Column(name = "preference_name", nullable = false)
  private String name;
  @Column(name = "json_value", nullable = false, columnDefinition = "TEXT")
  private String jsonValue;

  public Long getId() { return id; }
  public String getAccountRole() { return accountRole; }
  public void setAccountRole(String role) { accountRole = role; }
  public Long getAccountId() { return accountId; }
  public void setAccountId(Long value) { accountId = value; }
  public String getName() { return name; }
  public void setName(String value) { name = value; }
  public String getJsonValue() { return jsonValue; }
  public void setJsonValue(String value) { jsonValue = value; }
}

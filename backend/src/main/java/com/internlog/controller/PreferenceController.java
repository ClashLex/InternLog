package com.internlog.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.internlog.exception.BadRequestException;
import com.internlog.model.AccountPreference;
import com.internlog.repository.AccountPreferenceRepository;
import com.internlog.security.AccessPolicy;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/preferences")
public class PreferenceController {
  private static final Set<String> NAMES = Set.of("theme", "followupSnooze", "seenInternships", "savedInternships", "adminName");
  private final AccountPreferenceRepository preferences;
  private final AccessPolicy access;
  private final ObjectMapper json;
  public PreferenceController(AccountPreferenceRepository preferences, AccessPolicy access, ObjectMapper json) {
    this.preferences = preferences; this.access = access; this.json = json;
  }

  @GetMapping
  public Map<String, JsonNode> get() throws java.io.IOException {
    var who = access.identity();
    var result = new LinkedHashMap<String, JsonNode>();
    for (var preference : preferences.findByAccountRoleAndAccountId(who.role(), who.id())) {
      result.put(preference.getName(), json.readTree(preference.getJsonValue()));
    }
    return result;
  }

  @PutMapping("/{name}")
  @Transactional
  public JsonNode set(@PathVariable String name, @RequestBody JsonNode value) {
    var who = access.identity();
    if (!NAMES.contains(name) || value == null || value.isNull() || value.toString().length() > 65536) {
      throw new BadRequestException("Invalid preference.");
    }
    if (name.equals("theme") && !(value.isTextual() && Set.of("light", "dark").contains(value.asText()))) {
      throw new BadRequestException("Invalid theme.");
    }
    if ((name.equals("seenInternships") || name.equals("savedInternships")) && !value.isArray()) {
      throw new BadRequestException("Internship IDs must be a list.");
    }
    if (name.equals("followupSnooze") && !value.isObject()) throw new BadRequestException("Invalid follow-up preferences.");
    if (name.equals("adminName")) {
      access.admin();
      if (!value.isTextual() || value.asText().trim().length() < 3 || value.asText().length() > 100) {
        throw new BadRequestException("Enter a valid display name.");
      }
    }
    var preference = preferences.findByAccountRoleAndAccountIdAndName(who.role(), who.id(), name).orElseGet(AccountPreference::new);
    preference.setAccountRole(who.role()); preference.setAccountId(who.id());
    preference.setName(name); preference.setJsonValue(value.toString());
    preferences.save(preference);
    return value;
  }
}

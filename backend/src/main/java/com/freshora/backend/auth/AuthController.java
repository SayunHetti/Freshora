package com.freshora.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    public record LoginRequest(String username, String password) {}

    private final JwtService jwt;
    private final PasswordEncoder encoder;
    private final String adminUsername;
    private final String adminPasswordHash;

    public AuthController(JwtService jwt, PasswordEncoder encoder,
                          @Value("${app.admin.username}") String adminUsername,
                          @Value("${app.admin.password}") String adminPassword) {
        this.jwt = jwt;
        this.encoder = encoder;
        this.adminUsername = adminUsername;
        this.adminPasswordHash = encoder.encode(adminPassword);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody LoginRequest req) {
        boolean ok = req.username() != null && req.password() != null
                && adminUsername.equals(req.username())
                && encoder.matches(req.password(), adminPasswordHash);
                System.out.println("Username matches: " +
                adminUsername.equals(req.username()));
                System.out.println("Password matches: " +
        encoder.matches(req.password(), adminPasswordHash));
        if (!ok) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username or password"));
        }
        return ResponseEntity.ok(Map.of("token", jwt.create(adminUsername)));
    }
}
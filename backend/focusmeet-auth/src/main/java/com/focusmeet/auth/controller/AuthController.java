package com.focusmeet.auth.controller;

import com.focusmeet.auth.dto.AuthResponse;
import com.focusmeet.auth.dto.LoginRequest;
import com.focusmeet.auth.dto.RegisterRequest;
import com.focusmeet.auth.entity.User;
import com.focusmeet.auth.repository.UserRepository;
import com.focusmeet.auth.security.JwtService;
import com.focusmeet.common.dto.ApiResponse;
import com.focusmeet.common.exception.BadRequestException;
import com.focusmeet.common.exception.ConflictException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    /**
     * POST /api/auth/register
     * Creates a new user account and returns a signed JWT.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email is already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        User saved = userRepository.save(user);
        String token = jwtService.generateToken(saved.getId(), saved.getEmail());

        AuthResponse authResponse = AuthResponse.builder()
                .token(token)
                .userId(saved.getId())
                .name(saved.getName())
                .email(saved.getEmail())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Registration successful", authResponse));
    }

    /**
     * POST /api/auth/login
     * Validates credentials and returns a signed JWT.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid email or password");
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail());

        AuthResponse authResponse = AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .build();

        return ResponseEntity.ok(ApiResponse.ok("Login successful", authResponse));
    }
}

package com.notificationservice.config;

import com.notificationservice.security.CustomOAuth2UserService;
import com.notificationservice.security.JwtAuthenticationFilter;
import com.notificationservice.security.OAuth2RedirectFilter;
import com.notificationservice.security.OAuth2SuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Security configuration for the application.
 * Configures OAuth2, JWT authentication, and CORS.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService oAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final OAuth2RedirectFilter oAuth2RedirectFilter;

    @Value("${app.allowed-origins:http://localhost:3000}")
    private String allowedOriginsConfig;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/oauth2/**", "/login/**").permitAll()
                        .requestMatchers("/v1/liveconnect/**").permitAll()  // Embed key auth handled separately
                        .requestMatchers("/api/projects/*/liveconnect/ws").permitAll()  // Rep WebSocket
                        .requestMatchers("/webhooks/livekit").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo -> userInfo.userService(oAuth2UserService))
                        .successHandler(oAuth2SuccessHandler)
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

        // Allow all origins for /v1/liveconnect/** (widget endpoints, uses embed key auth)
        // GET is required for WebSocket upgrade handshake
        CorsConfiguration liveconnectConfig = new CorsConfiguration();
        liveconnectConfig.setAllowedOrigins(List.of("*"));
        liveconnectConfig.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        liveconnectConfig.setAllowedHeaders(List.of("*"));
        liveconnectConfig.setAllowCredentials(false);
        source.registerCorsConfiguration("/v1/liveconnect/**", liveconnectConfig);

        // Restricted origins for other endpoints
        CorsConfiguration defaultConfig = new CorsConfiguration();
        List<String> origins = Arrays.asList(allowedOriginsConfig.split(","));
        defaultConfig.setAllowedOrigins(origins.stream().map(String::trim).toList());
        defaultConfig.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        defaultConfig.setAllowedHeaders(List.of("*"));
        defaultConfig.setAllowCredentials(true);
        source.registerCorsConfiguration("/**", defaultConfig);

        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Registers the OAuth2RedirectFilter to run BEFORE Spring Security.
     * This ensures mobile parameter is captured before OAuth2 redirect.
     */
    @Bean
    public FilterRegistrationBean<OAuth2RedirectFilter> oAuth2RedirectFilterRegistration() {
        FilterRegistrationBean<OAuth2RedirectFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(oAuth2RedirectFilter);
        registration.addUrlPatterns("/oauth2/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}

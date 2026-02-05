package com.notificationservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter that captures the redirect_origin parameter from OAuth requests.
 * Stores the origin in a cookie so the success handler knows where to redirect.
 */
@Slf4j
@Component
public class OAuth2RedirectFilter extends OncePerRequestFilter {

    /** Cookie name for storing the redirect origin */
    public static final String REDIRECT_ORIGIN_COOKIE = "oauth_redirect_origin";

    /** Cookie name for storing mobile flag */
    public static final String MOBILE_COOKIE = "oauth_mobile";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        log.debug("Filter processing: {} with query: {}", request.getRequestURI(), request.getQueryString());

        if (request.getRequestURI().contains("/oauth2/authorization/")) {
            log.info("OAuth request detected - URI: {}, mobile param: {}",
                    request.getRequestURI(), request.getParameter("mobile"));
            String redirectOrigin = request.getParameter("redirect_origin");
            if (redirectOrigin != null && !redirectOrigin.isBlank()) {
                Cookie cookie = new Cookie(REDIRECT_ORIGIN_COOKIE, redirectOrigin);
                cookie.setPath("/");
                cookie.setHttpOnly(true);
                cookie.setMaxAge(300); // 5 minutes
                cookie.setSecure(request.isSecure());
                response.addCookie(cookie);
            }

            // Capture mobile parameter for iOS app redirect
            String mobile = request.getParameter("mobile");
            if ("true".equalsIgnoreCase(mobile)) {
                Cookie mobileCookie = new Cookie(MOBILE_COOKIE, "true");
                mobileCookie.setPath("/");
                mobileCookie.setHttpOnly(true);
                mobileCookie.setMaxAge(300); // 5 minutes
                mobileCookie.setSecure(request.isSecure());
                response.addCookie(mobileCookie);
                log.info("OAuth mobile cookie set");
            }
        }

        filterChain.doFilter(request, response);
    }
}

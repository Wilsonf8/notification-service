package com.notificationservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter that captures the redirect_origin parameter from OAuth requests.
 * Stores the origin in a cookie so the success handler knows where to redirect.
 */
@Component
public class OAuth2RedirectFilter extends OncePerRequestFilter {

    /** Cookie name for storing the redirect origin */
    public static final String REDIRECT_ORIGIN_COOKIE = "oauth_redirect_origin";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (request.getRequestURI().contains("/oauth2/authorization/")) {
            String redirectOrigin = request.getParameter("redirect_origin");
            if (redirectOrigin != null && !redirectOrigin.isBlank()) {
                Cookie cookie = new Cookie(REDIRECT_ORIGIN_COOKIE, redirectOrigin);
                cookie.setPath("/");
                cookie.setHttpOnly(true);
                cookie.setMaxAge(300); // 5 minutes
                cookie.setSecure(request.isSecure());
                response.addCookie(cookie);
            }
        }

        filterChain.doFilter(request, response);
    }
}

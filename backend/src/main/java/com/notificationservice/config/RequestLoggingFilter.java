package com.notificationservice.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Collections;

/**
 * Debug filter to log incoming requests.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class RequestLoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String path = httpRequest.getRequestURI();

        // Only log LiveConnect requests
        if (path.startsWith("/v1/liveconnect")) {
            log.info("[RequestLog] {} {} - Upgrade: {}, Connection: {}",
                    httpRequest.getMethod(),
                    path,
                    httpRequest.getHeader("Upgrade"),
                    httpRequest.getHeader("Connection"));

            // Log all headers for websocket requests
            if (path.contains("/ws")) {
                Collections.list(httpRequest.getHeaderNames()).forEach(headerName ->
                    log.info("[RequestLog] Header: {} = {}", headerName, httpRequest.getHeader(headerName))
                );
            }
        }

        chain.doFilter(request, response);
    }
}

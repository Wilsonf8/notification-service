package com.notificationservice.websocket.endpoint;

import jakarta.websocket.server.ServerEndpointConfig;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

/**
 * Configurator that allows JSR 356 WebSocket endpoints to be managed by Spring.
 * This enables dependency injection in WebSocket endpoint classes.
 */
@Component
public class SpringWebSocketConfigurator extends ServerEndpointConfig.Configurator implements ApplicationContextAware {

    private static volatile BeanFactory context;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        SpringWebSocketConfigurator.context = applicationContext;
    }

    @Override
    public <T> T getEndpointInstance(Class<T> endpointClass) throws InstantiationException {
        if (context == null) {
            throw new InstantiationException("Spring context not available");
        }
        return context.getBean(endpointClass);
    }

    /**
     * Allows all origins for WebSocket connections.
     * Widget authentication is handled via embed key validation in the endpoint.
     * @param originHeaderValue the Origin header value from the handshake request
     * @return true to allow all origins
     */
    @Override
    public boolean checkOrigin(String originHeaderValue) {
        return true;
    }
}

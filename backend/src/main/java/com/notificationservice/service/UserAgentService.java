package com.notificationservice.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ua_parser.Client;
import ua_parser.Parser;

/**
 * Service for parsing User-Agent strings into device/browser information.
 */
@Service
@Slf4j
public class UserAgentService {

    private Parser parser;

    /**
     * Device and browser information parsed from a User-Agent string.
     *
     * @param browserName browser name (e.g., "Chrome", "Safari")
     * @param browserVersion browser major version (e.g., "120")
     * @param osName operating system name (e.g., "Windows", "Mac OS X")
     * @param osVersion operating system version (e.g., "10", "14.2")
     * @param deviceType derived device type: "desktop", "mobile", or "tablet"
     * @param deviceBrand device brand if available (e.g., "Apple", "Samsung")
     */
    public record DeviceInfo(
            String browserName,
            String browserVersion,
            String osName,
            String osVersion,
            String deviceType,
            String deviceBrand
    ) {}

    /**
     * Initializes the UA parser on startup.
     */
    @PostConstruct
    public void init() {
        parser = new Parser();
        log.info("[UserAgent] Parser initialized");
    }

    /**
     * Parses a User-Agent string into device and browser information.
     *
     * @param userAgent the User-Agent header value
     * @return the parsed DeviceInfo, or null if the input is null/blank
     */
    public DeviceInfo parse(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }

        Client client = parser.parse(userAgent);

        String browserName = client.userAgent != null ? client.userAgent.family : null;
        String browserVersion = client.userAgent != null ? client.userAgent.major : null;
        String osName = client.os != null ? client.os.family : null;
        String osVersion = client.os != null ? client.os.major : null;
        String deviceFamily = client.device != null ? client.device.family : null;
        // ua-parser Device class doesn't expose brand; derive from family
        String deviceBrand = null;
        String deviceType = deriveDeviceType(osName, deviceFamily);

        return new DeviceInfo(browserName, browserVersion, osName, osVersion, deviceType, deviceBrand);
    }

    /**
     * Derives the device type from OS and device family.
     *
     * @param osName the operating system name
     * @param deviceFamily the device family string
     * @return "mobile", "tablet", or "desktop"
     */
    private String deriveDeviceType(String osName, String deviceFamily) {
        if (osName == null && deviceFamily == null) {
            return "desktop";
        }

        String osLower = osName != null ? osName.toLowerCase() : "";
        String deviceLower = deviceFamily != null ? deviceFamily.toLowerCase() : "";

        // Check for tablet indicators
        if (deviceLower.contains("ipad") || deviceLower.contains("tablet")
                || deviceLower.contains("kindle") || deviceLower.contains("nexus 7")
                || deviceLower.contains("nexus 10")) {
            return "tablet";
        }

        // Check for mobile indicators
        if (osLower.contains("android") || osLower.contains("ios")
                || deviceLower.contains("iphone") || deviceLower.contains("ipod")
                || osLower.contains("windows phone")) {
            // Android could be tablet — but without tablet keywords, assume mobile
            return "mobile";
        }

        return "desktop";
    }
}

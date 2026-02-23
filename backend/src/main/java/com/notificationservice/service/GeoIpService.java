package com.notificationservice.service;

import com.maxmind.db.CHMCache;
import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.exception.GeoIp2Exception;
import com.maxmind.geoip2.model.CityResponse;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.net.InetAddress;

/**
 * Service for resolving IP addresses to geographic locations using MaxMind GeoLite2.
 */
@Service
@Slf4j
public class GeoIpService {

    @Value("${app.geoip.database-path:data/GeoLite2-City.mmdb}")
    private String databasePath;

    private DatabaseReader databaseReader;

    /**
     * Geographic location resolved from an IP address.
     *
     * @param country full country name
     * @param countryCode ISO 3166-1 alpha-2 country code
     * @param region region/state/province name
     * @param city city name
     * @param latitude approximate latitude
     * @param longitude approximate longitude
     * @param timezone IANA timezone identifier
     */
    public record GeoLocation(
            String country,
            String countryCode,
            String region,
            String city,
            Double latitude,
            Double longitude,
            String timezone
    ) {}

    /**
     * Loads the MaxMind database on startup.
     */
    @PostConstruct
    public void init() {
        File dbFile = new File(databasePath);
        if (!dbFile.exists()) {
            log.warn("[GeoIP] Database file not found at {}. GeoIP resolution will be disabled.", databasePath);
            return;
        }
        try {
            databaseReader = new DatabaseReader.Builder(dbFile)
                    .withCache(new CHMCache())
                    .build();
            log.info("[GeoIP] Database loaded from {}", databasePath);
        } catch (IOException e) {
            log.error("[GeoIP] Failed to load database from {}: {}", databasePath, e.getMessage());
        }
    }

    /**
     * Closes the database reader on shutdown.
     */
    @PreDestroy
    public void destroy() {
        if (databaseReader != null) {
            try {
                databaseReader.close();
            } catch (IOException e) {
                log.warn("[GeoIP] Error closing database reader: {}", e.getMessage());
            }
        }
    }

    /**
     * Resolves an IP address to a geographic location.
     *
     * @param ip the IP address string
     * @return the resolved GeoLocation, or null if resolution fails or IP is private/local
     */
    public GeoLocation resolve(String ip) {
        if (databaseReader == null || ip == null || ip.isBlank()) {
            return null;
        }

        try {
            InetAddress address = InetAddress.getByName(ip);

            // Skip private/local/loopback addresses
            if (address.isLoopbackAddress() || address.isSiteLocalAddress() || address.isLinkLocalAddress()) {
                log.debug("[GeoIP] Skipping private/local IP: {}", ip);
                return null;
            }

            CityResponse response = databaseReader.city(address);

            String country = response.getCountry() != null ? response.getCountry().getName() : null;
            String countryCode = response.getCountry() != null ? response.getCountry().getIsoCode() : null;
            String region = response.getMostSpecificSubdivision() != null
                    ? response.getMostSpecificSubdivision().getName() : null;
            String city = response.getCity() != null ? response.getCity().getName() : null;
            Double latitude = response.getLocation() != null ? response.getLocation().getLatitude() : null;
            Double longitude = response.getLocation() != null ? response.getLocation().getLongitude() : null;
            String timezone = response.getLocation() != null ? response.getLocation().getTimeZone() : null;

            return new GeoLocation(country, countryCode, region, city, latitude, longitude, timezone);
        } catch (GeoIp2Exception e) {
            log.debug("[GeoIP] Could not resolve IP {}: {}", ip, e.getMessage());
            return null;
        } catch (IOException e) {
            log.warn("[GeoIP] IO error resolving IP {}: {}", ip, e.getMessage());
            return null;
        }
    }
}

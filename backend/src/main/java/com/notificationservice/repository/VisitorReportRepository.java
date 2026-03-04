package com.notificationservice.repository;

import com.notificationservice.entity.VisitorReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repository for visitor reports.
 */
public interface VisitorReportRepository extends JpaRepository<VisitorReport, UUID> {
}

# Phase 6 Verification Guide - AutoForwardX Worker Scaling & RAM Optimization

## Overview
This document outlines the comprehensive verification process for Phase 6 distributed worker system functionality, including dynamic worker management, RAM-aware session distribution, crash handling, and premium prioritization.

## Verification Test Suite

### 1. Worker Registration & Monitoring
**Objective**: Verify worker registration, heartbeat monitoring, and failure detection

**Test Steps**:
- Start 2-3 worker nodes
- Confirm workers register with main server
- Verify dashboard displays worker metrics (ID, RAM, sessions, status)
- Validate heartbeat every 10-15 seconds
- Kill one worker process
- Verify server detects disconnection within 15 seconds
- Confirm status changes to Offline/Unavailable

**Expected Results**:
- All workers visible in dashboard
- Real-time status updates
- Automatic failure detection

### 2. Session Assignment Based on RAM
**Objective**: Test intelligent load balancing with premium prioritization

**Test Steps**:
- Start 2 workers with different RAM loads
- Add multiple sessions (mix of free and premium users)
- Verify premium users assigned to least-loaded worker first
- Confirm free users queued when premium placement full
- Validate RAM/session limits respected
- Ensure no worker exceeds capacity

**Expected Results**:
- Premium users get priority assignment
- Load balancing based on RAM usage
- Capacity limits enforced

### 3. Worker Overflow & Fallback Handling
**Objective**: Test system behavior when all workers at capacity

**Test Steps**:
- Force all workers near max capacity
- Add new premium session
- Verify overflow assignment attempts
- Confirm system logs warnings when no workers available
- Validate no crashes or unhandled exceptions

**Expected Results**:
- Graceful overflow handling
- Proper queue management
- Warning alerts generated

### 4. RAM Efficiency: Idle Session Management
**Objective**: Verify efficient resource usage for idle sessions

**Test Steps**:
- Let sessions remain inactive for 10-15 minutes
- Verify sessions stay connected in idle state
- Monitor RAM usage per session (50-150 MB target)
- Confirm inactive sessions don't consume excess resources
- Check dashboard shows Idle vs Active status

**Expected Results**:
- Sessions remain connected when idle
- RAM usage within acceptable limits
- Clear idle/active status indication

### 5. RAM Cleanup & Session Recycling
**Objective**: Test memory management and session lifecycle

**Test Steps**:
- Simulate users stopping and restarting forwarding
- Verify memory released when sessions stopped
- Confirm session restart reuses client
- Check for zombie processes or duplicate clients

**Expected Results**:
- Proper memory cleanup
- Client reuse optimization
- No resource leaks

### 6. Task Execution Between Server & Worker
**Objective**: Validate inter-service communication

**Test Steps**:
- Send tasks from main server to worker
- Test various task types (stop session, reload rules, get RAM usage)
- Verify worker receives and executes tasks
- Confirm worker sends ACK/response
- Validate server updates task status

**Expected Results**:
- Reliable task delivery
- Proper execution confirmation
- Status tracking

### 7. Admin Dashboard Verification
**Objective**: Test administrative interface functionality

**Test Steps**:
- Login as admin
- Verify worker list with real-time metrics
- Test manual controls (start/stop worker, reassign sessions)
- Confirm session logs accessibility
- Verify user-to-worker assignment capability
- Check premium/free user tags

**Expected Results**:
- Complete administrative control
- Real-time monitoring data
- Manual override capabilities

### 8. Crash Recovery & Reassignment
**Objective**: Test system resilience and recovery

**Test Steps**:
- Simulate worker crash (kill -9) with active sessions
- Verify sessions marked as Failed
- Confirm reassignment to available workers
- Check detailed logs for recovery process

**Expected Results**:
- Automatic failure detection
- Session reassignment
- Comprehensive logging

### 9. Security & Communication Integrity
**Objective**: Validate security measures

**Test Steps**:
- Verify worker-server communication security
- Test unregistered worker rejection
- Confirm timestamped, traceable logs

**Expected Results**:
- Secure authentication
- Access control enforcement
- Audit trail maintenance

## Verification Results Format

| Test # | Feature Tested | Result | Notes |
|--------|---------------|--------|--------|
| 1 | Worker Registration | - | - |
| 2 | Session Load Distribution | - | - |
| 3 | Overflow Handling | - | - |
| 4 | Idle Session Management | - | - |
| 5 | RAM Cleanup & Recycling | - | - |
| 6 | Task Execution | - | - |
| 7 | Admin Dashboard | - | - |
| 8 | Crash Recovery | - | - |
| 9 | Security & Communication | - | - |

## Success Criteria
- All tests must pass with documented evidence
- System performance within acceptable parameters
- No critical failures or data loss
- Proper error handling and recovery
- Security measures functioning correctly
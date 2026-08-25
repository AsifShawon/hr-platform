# HR Platform On-Premises MVP: Troubleshooting & Disaster Recovery

## 1. Incident Resolution Matrix

### Issue 1: Cannot connect to `http://localhost` after running install
- **Symptoms**: Browser displays "Connection Refused" or timeout.
- **Root Cause**: Docker containers have not completed initial startup health checks.
- **Action**:
  1. Run `./pilot.sh status` (or `.\pilot.ps1 status`).
  2. Inspect container logs: `docker compose -f docker-compose.prod.yml logs caddy`.
  3. Ensure port 80/443 is not occupied by IIS, Apache, or another service (`netstat -ano | findstr 80`).

### Issue 2: Smartphone Camera displays "Secure Context Required" / SSL Error
- **Symptoms**: Smartphone connects to `https://<ip>` but cannot activate camera.
- **Root Cause**: Smartphone browser does not trust the Caddy internal Root Certificate Authority.
- **Action**:
  1. Download root CA from `https://<host-ip>/api/system/tls/root-ca`.
  2. Install and trust certificate on the mobile device.
  3. On iOS: Enable full trust in **Settings -> General -> About -> Certificate Trust Settings**.

### Issue 3: Caliper measurement indicates scale drift (e.g. 50 mm line measures 48.5 mm)
- **Symptoms**: Printed ID cards do not fit standard badge holders or are clipped.
- **Root Cause**: Operating system print dialog has "Fit to Printable Area" or "Shrink Oversized Pages" enabled.
- **Action**:
  1. In the print dialog, select **Scale: 100% / Actual Size**.
  2. Disable all automatic scaling or margins.
  3. Navigate to `/cards/calibration` and re-enter caliper measurements.

---

## 2. Disaster Recovery & Restoration

### Scenario: Host Server Failure or Accidental Volume Loss
If the host server experiences hardware failure or the database volume is corrupted:
1. Provision a fresh host machine meeting minimum prerequisites.
2. Install the platform bundle: `./pilot.sh install`.
3. Locate your most recent encrypted `.hrbackup` file.
4. Restore the backup:
   - Navigate to `/admin/restore` in the web UI.
   - Or use the CLI restoration tool:
     ```bash
     docker compose -f docker-compose.prod.yml exec -T api node apps/api/dist/scripts/restore-cli.js /app/storage/backups/<backup-file>.hrbackup
     ```
5. All database records, multi-script worker profiles, card snapshot issues, and encrypted photos are atomically restored.

---

## 3. Clean Uninstall (Preserving Data)

To remove the container stack while keeping all databases, media photos, and backups completely safe:
```bash
# Stop containers without deleting volumes:
docker compose -f docker-compose.prod.yml down

# To completely purge images but keep database volumes:
docker compose -f docker-compose.prod.yml down --rmi all
```
The named volumes (`hr_postgres_prod_data`, `hr_media_prod_data`, `hr_backup_prod_data`) remain intact on the host storage disk.

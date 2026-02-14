import { Card } from "../common/Card";
import { StatusPill } from "../common/StatusPill";
import type { School } from "../../types/domain";
import { buildMapEmbedUrl, formatDateTime, statusToColor } from "../../utils/analytics";

interface GeoIdentityPanelProps {
  school: School;
}

export const GeoIdentityPanel = ({ school }: GeoIdentityPanelProps) => {
  const { geoIdentity } = school;

  return (
    <Card title="Geo-Tagging & School Identity" subtitle="Verified real-time location intelligence">
      <div className="module-grid module-2">
        <div className="map-wrap">
          <iframe
            src={buildMapEmbedUrl(geoIdentity.latitude, geoIdentity.longitude)}
            title={`Map for ${geoIdentity.schoolName}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="details-grid">
          <div>
            <span className="k">School</span>
            <strong>{geoIdentity.schoolName}</strong>
          </div>
          <div>
            <span className="k">UDISE</span>
            <strong>{geoIdentity.udiseCode}</strong>
          </div>
          <div>
            <span className="k">Address</span>
            <strong>{geoIdentity.address}</strong>
          </div>
          <div>
            <span className="k">Block / District</span>
            <strong>
              {geoIdentity.block}, {geoIdentity.district}
            </strong>
          </div>
          <div>
            <span className="k">Internet</span>
            <StatusPill
              text={geoIdentity.internetStatus}
              color={statusToColor(geoIdentity.internetStatus)}
            />
          </div>
          <div>
            <span className="k">Power</span>
            <StatusPill text={geoIdentity.powerStatus} color={statusToColor(geoIdentity.powerStatus)} />
          </div>
          <div>
            <span className="k">Last Sync</span>
            <strong>{formatDateTime(geoIdentity.lastDeviceSync)}</strong>
          </div>
          <div>
            <span className="k">Last Activity</span>
            <strong>{formatDateTime(geoIdentity.lastActivity)}</strong>
          </div>
        </div>
      </div>
    </Card>
  );
};

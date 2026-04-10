import { CitizenCard as CitizenCardType, VisibilitySettings } from '@/lib/types';

type Props = {
  citizen: CitizenCardType;
  visible: VisibilitySettings;
};

function InfoRow({ label, value, title }: { label: React.ReactNode; value: React.ReactNode; title?: string | null }) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return (
    <div className="infoRow" title={title ?? undefined}>
      <span className="infoLabel">{label}</span>
      <span className="infoValue">{value}</span>
    </div>
  );
}

function buildHairLabel(citizen: CitizenCardType): string | null {
  const typeName = citizen.appearance.hair?.type_name;
  const colorName = citizen.appearance.hair?.color_name;
  if (!typeName && !colorName) {
    return null;
  }
  return [typeName, colorName].filter(Boolean).join(' · ');
}

function ColorDot({rgb, color, label,}: {rgb?: number[] | null; color?: string | null; label: string;}) {
   const backgroundColor = rgb && rgb.length >= 3? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`: color ?? null;
   if (!backgroundColor) {return <span className="colorDot colorDotPlaceholder" aria-label={label} />;}
    return (<span className="colorDot" aria-label={label} style={{ backgroundColor }} title={label}/>
  );
}//fix

export function CitizenCard({ citizen, visible }: Props) {
  const hairLabel = buildHairLabel(citizen);
  const hasPassword = citizen.security.password;
  const addressValue = visible.showHome ? citizen.home.name : '***';
  const passwordValue = visible.showSecurity ? hasPassword : hasPassword ? '***' : null;

  return (
    <article className="citizenCard compactCard">
      <div className="cardTop compactTop">
        <div className="badgeRow compactBadges">
          <span className="badge">ID {citizen.id ?? '—'}</span>
          {citizen.personal.gender ? <span className="badge muted">{citizen.personal.gender}</span> : null}
          {citizen.personal.height_category ? <span className="badge muted">{citizen.personal.height_category}</span> : null}
        </div>

        <h3>{citizen.name.full || 'Unknown citizen'}</h3>

        <div className="miniFacts">
          {citizen.personal.dob ? <span>DOB {citizen.personal.dob}</span> : null}
          {citizen.personal.height_cm ? <span>{citizen.personal.height_cm} cm</span> : null}
          {citizen.personal.weight_kg ? <span>{citizen.personal.weight_kg} kg</span> : null}
          {passwordValue ? <span>Password {passwordValue}</span> : null}
        </div>
      </div>

      <section className="sectionBlock compactSection"> 
        <div className="infoGrid compactInfoGrid">
          <InfoRow label={<>Eye{' '} <ColorDot color={citizen.appearance.eye?.name?.toLowerCase() ?? null} label="Eye color"/></>} value={citizen.appearance.eye?.name}/>
          <InfoRow label="Shoe" value={citizen.personal.shoe_size} />
          <InfoRow
            label={<>Hair <ColorDot rgb={citizen.appearance.hair?.color_rgb} label="Hair color" /></>}
            value={hairLabel}
            title={citizen.appearance.hair?.color_hex}
          />
          <InfoRow label="Address" value={addressValue} />
        </div>
      </section>

      {visible.showWork ? (
        <section className="sectionBlock compactSection">
          <h4>Work</h4>
          <div className="infoGrid compactInfoGrid oneColOnCompact">
            <InfoRow label="Company" value={citizen.work.company} title={citizen.work.address} />
            <InfoRow label="Position" value={citizen.work.position} />
          </div>
        </section>
      ) : null}

      {visible.showRelations ? (
        <section className="sectionBlock compactSection">
          <h4>Relations</h4>
          <div className="infoGrid compactInfoGrid oneColOnCompact">
            <InfoRow label="Partner" value={citizen.relations.partner_name} />
            <InfoRow label="Paramour" value={citizen.relations.paramour_name} />
          </div>
        </section>
      ) : null}

      {visible.showExtra ? (
        <section className="sectionBlock compactSection dangerZone">
          <h4>Extra</h4>
          <div className="infoGrid compactInfoGrid">
            <InfoRow label="Handwriting" value={citizen.extra.handwriting} />
            <InfoRow label="Homeless" value={citizen.extra.homeless ? 'Yes' : 'No'} />
            <InfoRow label="Partner raw" value={citizen.extra.partner_raw} />
            <InfoRow label="Paramour raw" value={citizen.extra.paramour_raw} />
          </div>
        </section>
      ) : null}
    </article>
  );//fix
}

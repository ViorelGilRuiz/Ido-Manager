type PdfSection = {
  title: string;
  description?: string;
  fields: Array<{ label: string; type: string }>;
};

export type PdfTheme =
  | 'romantic'
  | 'classic'
  | 'checklist'
  | 'timeline'
  | 'budget'
  | 'guest'
  | 'vendor'
  | 'dashboard'
  | 'events';

type PdfPayload = {
  title: string;
  subtitle?: string;
  meta?: Array<{ label: string; value: string | number }>;
  sections: PdfSection[];
  theme?: PdfTheme;
  design?: PdfDesign;
  exportOptions?: PdfExportOptions;
  freeLayout?: PdfFreeLayout;
};

export type PdfExportOptions = {
  preset?: 'signature' | 'minimal' | 'luxury';
  layoutMode?: 'cards' | 'list';
  showToc?: boolean;
  showWatermark?: boolean;
  showDesignSheet?: boolean;
  showGeneratedStamp?: boolean;
  watermarkText?: string;
  footerText?: string;
  pageFormat?: 'A4' | 'Letter';
  density?: 'comfortable' | 'compact';
};

export type PdfFreeLayoutElement = {
  id: string;
  type: 'text' | 'image' | 'shape' | 'label';
  visible?: boolean;
  text?: string;
  imageUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  background?: string;
  borderColor?: string;
  borderRadius?: number;
  shadow?: string;
};

export type PdfFreeLayout = {
  blankPaperMode?: boolean;
  paperPreset?: 'a4p' | 'a4l' | 'square' | 'tall' | 'custom';
  paperWidth?: number;
  paperHeight?: number;
  showRulers?: boolean;
  showLayerLabels?: boolean;
  elements?: PdfFreeLayoutElement[];
};

export type PdfDesign = {
  fontFamily?: string;
  titleFontFamily?: string;
  primaryColor?: string;
  accentColor?: string;
  pageBackground?: string;
  heroImageUrl?: string;
  logoImageUrl?: string;
  compactMode?: boolean;
};

type ThemeConfig = {
  bodyBg: string;
  heroBg: string;
  heroOrbA: string;
  heroOrbB: string;
  sparkA: string;
  sparkB: string;
  eyebrowColor: string;
  metaLabelColor: string;
  primaryButtonBg: string;
  cardBg: string;
  sectionCountColor: string;
  fieldTypeColor: string;
  eyebrowText: string;
};

function escapeHtml(value: unknown) {
  const safe = String(value ?? '');
  return safe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveTheme(theme: PdfTheme): ThemeConfig {
  const themes: Record<PdfTheme, ThemeConfig> = {
    romantic: {
      bodyBg:
        'radial-gradient(circle at 10% 0%,rgba(244,114,182,.18),transparent 34%),radial-gradient(circle at 90% 10%,rgba(14,165,233,.14),transparent 40%),linear-gradient(180deg,#fff8fb,#f8fbff 60%,#f3f6fb)',
      heroBg: 'linear-gradient(145deg,#ffffff,#fff8fc 48%,#f4f9ff)',
      heroOrbA: 'rgba(251,113,133,.16)',
      heroOrbB: 'rgba(34,197,94,.14)',
      sparkA: 'rgba(236,72,153,.5)',
      sparkB: 'rgba(6,182,212,.45)',
      eyebrowColor: '#be185d',
      metaLabelColor: '#7c3aed',
      primaryButtonBg: 'linear-gradient(145deg,#db2777,#0ea5e9)',
      cardBg: 'linear-gradient(160deg,#ffffff,#fff8fb)',
      sectionCountColor: '#0f766e',
      fieldTypeColor: '#7c3aed',
      eyebrowText: 'Wedding Template Studio',
    },
    classic: {
      bodyBg:
        'radial-gradient(circle at 8% 0%,rgba(251,191,36,.14),transparent 36%),radial-gradient(circle at 95% 12%,rgba(37,99,235,.12),transparent 42%),linear-gradient(180deg,#fffdf6,#f8fafc 62%,#f1f5f9)',
      heroBg: 'linear-gradient(145deg,#ffffff,#fffaf0 52%,#eff6ff)',
      heroOrbA: 'rgba(250,204,21,.16)',
      heroOrbB: 'rgba(59,130,246,.15)',
      sparkA: 'rgba(245,158,11,.42)',
      sparkB: 'rgba(59,130,246,.38)',
      eyebrowColor: '#92400e',
      metaLabelColor: '#1d4ed8',
      primaryButtonBg: 'linear-gradient(145deg,#b45309,#2563eb)',
      cardBg: 'linear-gradient(160deg,#ffffff,#fffbeb)',
      sectionCountColor: '#1d4ed8',
      fieldTypeColor: '#92400e',
      eyebrowText: 'Wedding Signature Plan',
    },
    checklist: {
      bodyBg:
        'radial-gradient(circle at 8% 8%,rgba(16,185,129,.16),transparent 34%),radial-gradient(circle at 92% 18%,rgba(14,165,233,.14),transparent 40%),linear-gradient(180deg,#f0fdf4,#f0fdfa 56%,#f8fafc)',
      heroBg: 'linear-gradient(145deg,#ffffff,#ecfeff 48%,#eff6ff)',
      heroOrbA: 'rgba(16,185,129,.18)',
      heroOrbB: 'rgba(14,165,233,.16)',
      sparkA: 'rgba(16,185,129,.5)',
      sparkB: 'rgba(14,165,233,.45)',
      eyebrowColor: '#047857',
      metaLabelColor: '#0369a1',
      primaryButtonBg: 'linear-gradient(145deg,#047857,#0284c7)',
      cardBg: 'linear-gradient(160deg,#ffffff,#ecfdf5)',
      sectionCountColor: '#0f766e',
      fieldTypeColor: '#0369a1',
      eyebrowText: 'Checklist Premium',
    },
    timeline: {
      bodyBg:
        'radial-gradient(circle at 10% 10%,rgba(59,130,246,.16),transparent 34%),radial-gradient(circle at 92% 20%,rgba(14,165,233,.13),transparent 40%),linear-gradient(180deg,#eff6ff,#f0f9ff 58%,#f8fafc)',
      heroBg: 'linear-gradient(145deg,#ffffff,#eff6ff 52%,#ecfeff)',
      heroOrbA: 'rgba(59,130,246,.16)',
      heroOrbB: 'rgba(14,165,233,.14)',
      sparkA: 'rgba(37,99,235,.45)',
      sparkB: 'rgba(6,182,212,.42)',
      eyebrowColor: '#1d4ed8',
      metaLabelColor: '#0e7490',
      primaryButtonBg: 'linear-gradient(145deg,#1d4ed8,#0891b2)',
      cardBg: 'linear-gradient(160deg,#ffffff,#eff6ff)',
      sectionCountColor: '#1d4ed8',
      fieldTypeColor: '#0e7490',
      eyebrowText: 'Timeline Dia B',
    },
    budget: {
      bodyBg:
        'radial-gradient(circle at 8% 10%,rgba(245,158,11,.18),transparent 34%),radial-gradient(circle at 92% 18%,rgba(16,185,129,.14),transparent 42%),linear-gradient(180deg,#fffbeb,#f0fdf4 60%,#f8fafc)',
      heroBg: 'linear-gradient(145deg,#ffffff,#fffbeb 50%,#ecfdf5)',
      heroOrbA: 'rgba(245,158,11,.18)',
      heroOrbB: 'rgba(16,185,129,.15)',
      sparkA: 'rgba(245,158,11,.5)',
      sparkB: 'rgba(5,150,105,.42)',
      eyebrowColor: '#b45309',
      metaLabelColor: '#047857',
      primaryButtonBg: 'linear-gradient(145deg,#b45309,#059669)',
      cardBg: 'linear-gradient(160deg,#ffffff,#fff7ed)',
      sectionCountColor: '#b45309',
      fieldTypeColor: '#047857',
      eyebrowText: 'Budget Wedding Control',
    },
    guest: {
      bodyBg:
        'radial-gradient(circle at 6% 8%,rgba(236,72,153,.16),transparent 34%),radial-gradient(circle at 90% 10%,rgba(99,102,241,.14),transparent 40%),linear-gradient(180deg,#fdf2f8,#eef2ff 60%,#f8fafc)',
      heroBg: 'linear-gradient(145deg,#ffffff,#fdf2f8 50%,#eef2ff)',
      heroOrbA: 'rgba(236,72,153,.18)',
      heroOrbB: 'rgba(99,102,241,.14)',
      sparkA: 'rgba(236,72,153,.45)',
      sparkB: 'rgba(99,102,241,.4)',
      eyebrowColor: '#be185d',
      metaLabelColor: '#6d28d9',
      primaryButtonBg: 'linear-gradient(145deg,#be185d,#6366f1)',
      cardBg: 'linear-gradient(160deg,#ffffff,#fdf2f8)',
      sectionCountColor: '#be185d',
      fieldTypeColor: '#6d28d9',
      eyebrowText: 'Guest Experience Plan',
    },
    vendor: {
      bodyBg:
        'radial-gradient(circle at 8% 10%,rgba(14,116,144,.16),transparent 34%),radial-gradient(circle at 92% 14%,rgba(148,163,184,.2),transparent 42%),linear-gradient(180deg,#ecfeff,#f8fafc 58%,#eef2ff)',
      heroBg: 'linear-gradient(145deg,#ffffff,#ecfeff 50%,#f1f5f9)',
      heroOrbA: 'rgba(14,116,144,.16)',
      heroOrbB: 'rgba(100,116,139,.15)',
      sparkA: 'rgba(14,116,144,.44)',
      sparkB: 'rgba(100,116,139,.38)',
      eyebrowColor: '#0e7490',
      metaLabelColor: '#334155',
      primaryButtonBg: 'linear-gradient(145deg,#0e7490,#334155)',
      cardBg: 'linear-gradient(160deg,#ffffff,#f0f9ff)',
      sectionCountColor: '#0e7490',
      fieldTypeColor: '#334155',
      eyebrowText: 'Vendor Operations Board',
    },
    dashboard: {
      bodyBg:
        'radial-gradient(circle at 8% 8%,rgba(15,118,110,.16),transparent 34%),radial-gradient(circle at 90% 12%,rgba(37,99,235,.13),transparent 40%),linear-gradient(180deg,#f0fdfa,#eff6ff 60%,#f8fafc)',
      heroBg: 'linear-gradient(145deg,#ffffff,#ecfeff 48%,#eff6ff)',
      heroOrbA: 'rgba(15,118,110,.16)',
      heroOrbB: 'rgba(37,99,235,.14)',
      sparkA: 'rgba(13,148,136,.4)',
      sparkB: 'rgba(37,99,235,.4)',
      eyebrowColor: '#0f766e',
      metaLabelColor: '#1d4ed8',
      primaryButtonBg: 'linear-gradient(145deg,#0f766e,#1d4ed8)',
      cardBg: 'linear-gradient(160deg,#ffffff,#f0fdfa)',
      sectionCountColor: '#0f766e',
      fieldTypeColor: '#1d4ed8',
      eyebrowText: 'Business Cockpit',
    },
    events: {
      bodyBg:
        'radial-gradient(circle at 7% 8%,rgba(249,115,22,.18),transparent 36%),radial-gradient(circle at 90% 12%,rgba(20,184,166,.13),transparent 40%),linear-gradient(180deg,#fff7ed,#f0fdfa 60%,#f8fafc)',
      heroBg: 'linear-gradient(145deg,#ffffff,#fff7ed 48%,#ecfeff)',
      heroOrbA: 'rgba(249,115,22,.17)',
      heroOrbB: 'rgba(20,184,166,.14)',
      sparkA: 'rgba(249,115,22,.44)',
      sparkB: 'rgba(20,184,166,.4)',
      eyebrowColor: '#c2410c',
      metaLabelColor: '#0f766e',
      primaryButtonBg: 'linear-gradient(145deg,#c2410c,#0f766e)',
      cardBg: 'linear-gradient(160deg,#ffffff,#fff7ed)',
      sectionCountColor: '#c2410c',
      fieldTypeColor: '#0f766e',
      eyebrowText: 'Events Control Center',
    },
  };

  return themes[theme];
}

function toFieldTypeLabel(type: string) {
  const map: Record<string, string> = {
    text: 'Texto',
    checkbox: 'Checklist',
    currency: 'Moneda',
    time: 'Hora',
    number: 'Numero',
    textarea: 'Observaciones',
    date: 'Fecha',
    select: 'Selector',
    metric: 'Dato',
  };
  return map[(type || '').toLowerCase()] ?? 'Dato';
}

function toProfessionalFieldLabel(label: string, sectionTitle: string, fieldIndex: number) {
  const clean = (label || '').trim().toLowerCase();
  const section = (sectionTitle || '').toLowerCase();

  const exactMap: Record<string, string> = {
    campo: 'Campo operativo validado',
    responsable: 'Responsable asignado del equipo',
    hito: 'Hito operativo del cronograma',
    estado: 'Estado de avance',
    partida: 'Partida presupuestaria',
    previsto: 'Importe previsto aprobado',
    real: 'Importe real facturado',
    diferencia: 'Desviacion presupuestaria final',
    notas: 'Observaciones operativas del planner',
    'aprobacion final': 'Aprobacion final del cliente',
    'tarea principal': 'Hito principal del bloque',
    'persona encargada': 'Responsable asignado del equipo',
    'fecha objetivo': 'Fecha compromiso de entrega',
    'contacto principal': 'Contacto principal del proveedor',
    'hora llegada': 'Hora de llegada confirmada',
    'pago pendiente': 'Pago pendiente y vencimiento',
    riesgos: 'Riesgo detectado y mitigacion',
  };

  if (exactMap[clean]) return exactMap[clean];

  if (!clean) {
    return `Campo operativo ${fieldIndex + 1}`;
  }

  if (section.includes('ceremonia') && clean.includes('musica')) return 'Musica de entrada y momentos clave';
  if (section.includes('invitado') && clean.includes('mesa')) return 'Mesa asignada y zona del salon';
  if (section.includes('presupuesto') && clean.includes('estado')) return 'Estado de pago y validacion';

  return label;
}

function buildEventReport(sections: PdfSection[]) {
  const joinText = sections
    .map((section) => `${section.title} ${(section.fields ?? []).map((field) => field.label).join(' ')}`)
    .join(' ')
    .toLowerCase();

  const hasBudget = /(presupuesto|budget|coste|importe|pago)/.test(joinText);
  const hasGuests = /(invitad|guest|rsvp|mesa)/.test(joinText);
  const hasVendors = /(proveedor|vendor|contrato|contacto)/.test(joinText);
  const hasTimeline = /(timeline|cronograma|dia b|ceremonia|hora)/.test(joinText);
  const hasLogistics = /(logistica|transporte|montaje|plan b|contingencia)/.test(joinText);

  const covered = [
    hasBudget && 'Finanzas',
    hasGuests && 'Invitados',
    hasVendors && 'Proveedores',
    hasTimeline && 'Cronograma',
    hasLogistics && 'Logistica',
  ].filter(Boolean) as string[];

  const missing = ['Finanzas', 'Invitados', 'Proveedores', 'Cronograma', 'Logistica'].filter(
    (item) => !covered.includes(item),
  );

  const coverageScore = Math.round((covered.length / 5) * 100);
  const riskLevel = missing.length >= 3 ? 'Alto' : missing.length >= 1 ? 'Medio' : 'Bajo';
  const recommendation =
    missing.length === 0
      ? 'Plantilla completa para presentacion y ejecucion de evento con cliente.'
      : `Reforzar bloques: ${missing.join(', ')} para cerrar cobertura operativa.`;

  return { coverageScore, riskLevel, covered, missing, recommendation };
}

export function openTemplatePdfPreview(payload: PdfPayload) {
  const win = window.open('', '_blank');
  if (!win) return false;

  const theme = resolveTheme(payload.theme ?? 'romantic');
  const design = payload.design ?? {};
  const baseFont = design.fontFamily || "'Segoe UI',Tahoma,sans-serif";
  const titleFont = design.titleFontFamily || "'Georgia','Times New Roman',serif";
  const primaryColor = design.primaryColor || theme.sectionCountColor;
  const accentColor = design.accentColor || theme.fieldTypeColor;
  const customBg = design.pageBackground || theme.bodyBg;
  const compactMode = Boolean(design.compactMode);
  const exportOptions = payload.exportOptions ?? {};
  const densityCompact = (exportOptions.density ?? (compactMode ? 'compact' : 'comfortable')) === 'compact';
  const layoutMode = exportOptions.layoutMode ?? 'cards';
  const showToc = exportOptions.showToc ?? true;
  const showWatermark = exportOptions.showWatermark ?? false;
  const showDesignSheet = exportOptions.showDesignSheet ?? true;
  const showGeneratedStamp = exportOptions.showGeneratedStamp ?? true;
  const watermarkText = exportOptions.watermarkText?.trim() || 'I Do Manager';
  const footerText =
    exportOptions.footerText?.trim() || 'Documento preparado con I Do Manager - Wedding Planner Workspace';
  const pageFormat = exportOptions.pageFormat ?? 'A4';
  const exportPreset = exportOptions.preset ?? 'signature';
  const heroWithImage = design.heroImageUrl
    ? `linear-gradient(160deg, rgba(15, 23, 42, 0.52), rgba(15, 118, 110, 0.36)), url('${escapeHtml(design.heroImageUrl)}')`
    : null;
  const logoHtml = design.logoImageUrl
    ? `<img class="brand-logo" src="${escapeHtml(design.logoImageUrl)}" alt="logo" />`
    : '';
  const report = buildEventReport(payload.sections ?? []);
  const freeLayout = payload.freeLayout;
  const freeLayoutPaperWidth = Math.max(360, Number(freeLayout?.paperWidth ?? 720));
  const freeLayoutPaperHeight = Math.max(360, Number(freeLayout?.paperHeight ?? 720));
  const totalFieldsCount = (payload.sections ?? []).reduce((sum, section) => sum + (section.fields?.length ?? 0), 0);
  const presetAccent =
    exportPreset === 'luxury' ? '#a16207' : exportPreset === 'minimal' ? '#334155' : accentColor;
  const presetCardBg =
    exportPreset === 'luxury'
      ? 'linear-gradient(165deg,#fffef8,#fff7e6)'
      : exportPreset === 'minimal'
        ? 'linear-gradient(165deg,#ffffff,#f8fafc)'
        : theme.cardBg;

  const metaHtml =
    payload.meta?.length
      ? `<div class="meta-grid">${payload.meta
          .map(
            (item) =>
              `<article><p>${escapeHtml(item.label)}</p><strong>${escapeHtml(String(item.value))}</strong></article>`,
          )
          .join('')}</div>`
      : '';

  const sectionsHtml = (payload.sections ?? [])
    .map(
      (section) => `
        <section class="section-card">
          <header>
            <h3>${escapeHtml(section?.title || 'Seccion')}</h3>
            <span>${section?.fields?.length ?? 0} campos</span>
          </header>
          ${section?.description ? `<p>${escapeHtml(section.description)}</p>` : ''}
          <ul>
            ${(section?.fields ?? [])
              .map(
                (field, fieldIndex) =>
                  `<li><span>${escapeHtml(toProfessionalFieldLabel(field?.label || '', section?.title || '', fieldIndex))}</span><small>${escapeHtml(toFieldTypeLabel(field?.type || 'text'))}</small></li>`,
              )
              .join('')}
          </ul>
        </section>
      `,
    )
    .join('');

  const tocHtml = showToc
    ? `<section class="toc-card">
        <header><h3>Indice de bloques</h3><span>${escapeHtml(payload.sections.length)} bloques</span></header>
        <ol>
          ${(payload.sections ?? [])
            .map(
              (section, index) =>
                `<li><span>${index + 1}. ${escapeHtml(section.title || 'Seccion')}</span><small>${escapeHtml(
                  String(section.fields?.length ?? 0),
                )} campos</small></li>`,
            )
            .join('')}
        </ol>
      </section>`
    : '';

  const generatedStampHtml = showGeneratedStamp
    ? `<p class="generated-stamp">Generado: ${escapeHtml(new Date().toLocaleString())}</p>`
    : '';

  const freeLayoutSheetHtml =
    showDesignSheet && freeLayout?.elements?.length
      ? `<section class="design-sheet">
          <div class="design-sheet-head">
            <h3>Composicion visual del template</h3>
            <span>Editor Pro · Hoja libre</span>
          </div>
          <div class="design-sheet-canvas" style="width:${freeLayoutPaperWidth}px;min-height:${freeLayoutPaperHeight}px;height:${freeLayoutPaperHeight}px;">
            ${[...freeLayout.elements]
              .filter((el) => el.visible !== false)
              .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
              .map((el) => {
                const commonStyle = [
                  `left:${Math.max(0, el.x)}px`,
                  `top:${Math.max(0, el.y)}px`,
                  `width:${Math.max(20, el.width)}px`,
                  `height:${Math.max(20, el.height)}px`,
                  `transform:rotate(${el.rotation || 0}deg)`,
                  `z-index:${el.zIndex ?? 1}`,
                  `opacity:${el.opacity ?? 1}`,
                  `color:${el.color || '#0f172a'}`,
                  `background:${el.background || (el.type === 'text' ? 'transparent' : 'rgba(255,255,255,.5)')}`,
                  `border:1px solid ${el.borderColor || 'rgba(148,163,184,.28)'}`,
                  `border-radius:${el.borderRadius ?? 12}px`,
                  `box-shadow:${el.shadow || 'none'}`,
                  `font-family:${el.fontFamily || "'Poppins','Segoe UI',sans-serif"}`,
                  `font-size:${el.fontSize ?? 16}px`,
                  `font-weight:${el.fontWeight ?? 500}`,
                ].join(';');
                if (el.type === 'image') {
                  return `<div class="design-el" style="${commonStyle};padding:0;overflow:hidden;"><img src="${escapeHtml(
                    el.imageUrl || '',
                  )}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" /></div>`;
                }
                if (el.type === 'shape') {
                  return `<div class="design-el" style="${commonStyle};padding:0;"></div>`;
                }
                return `<div class="design-el" style="${commonStyle};padding:8px 10px;display:flex;align-items:center;">${escapeHtml(
                  el.text || '',
                )}</div>`;
              })
              .join('')}
          </div>
        </section>`
      : '';

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(payload.title)} - PDF</title>
  <style>
    *{box-sizing:border-box}
    body{
      margin:0;
      font-family:${baseFont};
      color:#1f2937;
      background:${customBg};
      line-height:1.45;
    }
    @page{size:${pageFormat}; margin:${densityCompact ? '10mm' : '12mm'};}
    .page{max-width:980px;margin:0 auto;padding:${densityCompact ? '18px 16px 22px' : '30px 24px 38px'}; position:relative}
    .page::before{
      content:${showWatermark ? `'${escapeHtml(watermarkText)}'` : "''"};
      position:fixed;
      inset:45% auto auto 50%;
      transform:translate(-50%,-50%) rotate(-18deg);
      font-size:${exportPreset === 'luxury' ? '42px' : '36px'};
      font-family:${titleFont};
      letter-spacing:.12em;
      color:rgba(148,163,184,.14);
      pointer-events:none;
      z-index:0;
      white-space:nowrap;
    }
    .page > *{position:relative;z-index:1}
    .hero{
      position:relative;
      overflow:hidden;
      border:1px solid #ead7e1;
      border-radius:22px;
      padding:${densityCompact ? '18px 16px 14px' : '26px 24px 20px'};
      text-align:center;
      background:
        radial-gradient(circle at 14% 14%,${theme.heroOrbA},transparent 35%),
        radial-gradient(circle at 88% 20%,${theme.heroOrbB},transparent 36%),
        ${heroWithImage ?? theme.heroBg};
      background-size: cover;
      background-position: center;
      box-shadow:${exportPreset === 'luxury' ? '0 20px 40px rgba(17,24,39,.14)' : '0 18px 32px rgba(15,23,42,.1)'};
    }
    .hero-grid{
      display:grid;
      grid-template-columns:minmax(0,1.25fr) minmax(220px,.75fr);
      gap:${densityCompact ? '12px' : '16px'};
      align-items:start;
      text-align:left;
    }
    .hero-main,.hero-side{position:relative;z-index:1}
    .hero-side{
      display:grid;
      gap:10px;
      align-content:start;
    }
    .hero-side-card{
      border:1px solid rgba(226,232,240,.85);
      border-radius:16px;
      padding:12px;
      background:rgba(255,255,255,.88);
      backdrop-filter:blur(6px);
      box-shadow:0 10px 20px rgba(15,23,42,.06);
    }
    .hero-side-card h4{
      margin:0 0 8px;
      font-size:11px;
      letter-spacing:.08em;
      text-transform:uppercase;
      color:${presetAccent};
      font-weight:700;
    }
    .hero-score{
      display:grid;
      grid-template-columns:auto 1fr;
      gap:10px;
      align-items:center;
    }
    .hero-score strong{
      font-family:${titleFont};
      font-size:${exportPreset === 'luxury' ? '28px' : '24px'};
      line-height:1;
      color:#0f172a;
    }
    .hero-score p{margin:0;color:#475569;font-size:12px}
    .hero-mini-grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px;
    }
    .hero-mini-grid article{
      border:1px solid #e7edf4;
      border-radius:12px;
      padding:8px;
      background:#fff;
    }
    .hero-mini-grid article p{
      margin:0;
      font-size:10px;
      letter-spacing:.08em;
      text-transform:uppercase;
      color:#64748b;
    }
    .hero-mini-grid article strong{
      display:block;
      margin-top:2px;
      font-size:15px;
      color:#0f172a;
    }
    .hero::before,.hero::after{
      content:'';
      position:absolute;
      width:180px;height:180px;border-radius:999px;pointer-events:none;opacity:.35
    }
    .hero::before{left:-64px;top:-66px;background:radial-gradient(circle,${theme.sparkA},rgba(236,72,153,0))}
    .hero::after{right:-62px;bottom:-70px;background:radial-gradient(circle,${theme.sparkB},rgba(6,182,212,0))}
    .eyebrow{
      margin:0 0 8px;
      letter-spacing:.16em;
      text-transform:uppercase;
      color:${theme.eyebrowColor};
      font-weight:700;
      font-size:11px;
    }
    .hero h1{
      margin:0 0 8px;
      font-size:${densityCompact ? '28px' : exportPreset === 'luxury' ? '36px' : '34px'};
      letter-spacing:.02em;
      font-family:${titleFont};
      color:#0f172a;
    }
    .hero p{margin:0;color:#4b5563;font-size:${densityCompact ? '13px' : '15px'}}
    .meta-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
      gap:10px;
      margin-top:${densityCompact ? '12px' : '16px'};
      text-align:left;
    }
    .meta-grid article{
      border:1px solid #eadfeb;
      border-radius:14px;
      padding:10px 12px;
      background:${exportPreset === 'minimal' ? '#fff' : 'linear-gradient(165deg,#ffffff,#fdf4ff)'};
    }
    .meta-grid p{
      margin:0;
      font-size:11px;
      letter-spacing:.08em;
      text-transform:uppercase;
      color:${presetAccent};
      font-weight:700;
    }
    .meta-grid strong{font-size:21px;color:#111827}
    .report-box{
      border:1px solid #e6d7e3;
      border-radius:16px;
      padding:${densityCompact ? '11px' : '14px'};
      background:${exportPreset === 'luxury' ? 'linear-gradient(170deg,#fffef7,#fff7ed)' : 'linear-gradient(170deg,#ffffff,#f9f4ff)'};
      text-align:left;
      box-shadow:0 12px 22px rgba(15,23,42,.06);
    }
    .report-box h2{
      margin:0 0 8px;
      font-size:18px;
      font-family:'Georgia','Times New Roman',serif;
      color:#111827;
    }
    .report-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
      gap:8px;
      margin-bottom:8px;
    }
    .report-grid article{
      border:1px solid #e9d9e8;
      border-radius:10px;
      padding:8px;
      background:#fff;
    }
    .report-grid p{margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280}
    .report-grid strong{font-size:18px}
    .report-copy{margin:0;color:#4b5563;font-size:13px}
    .toolbar-panel{
      margin-top:${densityCompact ? '10px' : '14px'};
      border:1px solid #e6edf5;
      border-radius:16px;
      background:rgba(255,255,255,.88);
      backdrop-filter:blur(8px);
      padding:${densityCompact ? '10px' : '12px'};
      display:flex;
      gap:10px;
      align-items:center;
      justify-content:space-between;
      box-shadow:0 10px 22px rgba(15,23,42,.05);
    }
    .toolbar-copy{
      margin:0;
      font-size:12px;
      color:#475569;
    }
    .actions{
      display:flex;
      gap:8px;
      justify-content:flex-end;
      margin:0;
      flex-wrap:wrap;
    }
    .btn{
      border:1px solid #d4d4d8;
      border-radius:999px;
      background:#fff;
      padding:8px 14px;
      font-weight:600;
      cursor:pointer;
    }
    .btn.primary{
      background:${theme.primaryButtonBg};
      color:#fff;
      border-color:transparent;
      box-shadow:0 10px 18px rgba(14,116,144,.24);
    }
    .toc-card{
      border:1px solid #e7dde6;
      border-radius:16px;
      padding:${densityCompact ? '10px' : '12px'};
      background:rgba(255,255,255,.86);
      backdrop-filter: blur(6px);
      box-shadow:0 10px 22px rgba(15,23,42,.05);
    }
    .toc-card header{
      display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:8px;
      border-bottom:1px dashed #e5dbe4;padding-bottom:6px;
    }
    .toc-card h3{margin:0;font-size:16px;font-family:${titleFont}}
    .toc-card header span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${presetAccent};font-weight:700}
    .toc-card ol{margin:0;padding:0 0 0 18px;display:grid;gap:6px}
    .toc-card li{display:grid;grid-template-columns:1fr auto;gap:8px;font-size:12px;color:#334155}
    .toc-card li small{color:${presetAccent};font-weight:700}
    .design-sheet{
      margin-top:${densityCompact ? '10px' : '14px'};
      border:1px solid #e7dde6;
      border-radius:16px;
      padding:${densityCompact ? '10px' : '12px'};
      background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(248,250,252,.88));
    }
    .design-sheet-head{
      display:flex;justify-content:space-between;align-items:baseline;gap:8px;
      margin-bottom:8px;padding-bottom:6px;border-bottom:1px dashed #e5dbe4;
    }
    .design-sheet-head h3{margin:0;font-size:16px;font-family:${titleFont}}
    .design-sheet-head span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${presetAccent};font-weight:700}
    .design-sheet-canvas{
      position:relative;
      min-height:420px;
      background:#fff;
      border:1px solid #e5e7eb;
      border-radius:14px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.8);
      overflow:hidden;
      background-image:linear-gradient(rgba(148,163,184,.08) 1px, transparent 1px),linear-gradient(90deg, rgba(148,163,184,.08) 1px, transparent 1px);
      background-size:20px 20px;
    }
    .generated-stamp{
      margin:${densityCompact ? '8px 0 0' : '10px 0 0'};
      font-size:11px;
      color:#64748b;
      text-align:left;
      letter-spacing:.03em;
    }
    .overview-grid{
      display:grid;
      grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);
      gap:${densityCompact ? '10px' : '14px'};
      margin-top:${densityCompact ? '10px' : '14px'};
      align-items:start;
    }
    .design-el{position:absolute}
    .section-list{
      display:grid;
      grid-template-columns:${layoutMode === 'list' ? '1fr' : `repeat(auto-fit,minmax(${densityCompact ? '260px' : '300px'},1fr))`};
      gap:${densityCompact ? '9px' : '12px'};
      margin-top:${densityCompact ? '12px' : '16px'};
      align-items:start;
    }
    .section-card{
      border:1px solid #e5d6e1;
      border-radius:${densityCompact ? '12px' : '16px'};
      padding:${densityCompact ? '10px' : '13px'};
      background:${presetCardBg};
      box-shadow:0 10px 20px rgba(15,23,42,.06);
      break-inside:avoid;
      ${layoutMode === 'list' ? 'display:block;' : ''}
    }
    .section-card header{
      display:flex;
      justify-content:space-between;
      align-items:baseline;
      gap:10px;
      border-bottom:1px dashed #e8dbe4;
      padding-bottom:8px;
      margin-bottom:8px;
    }
    .section-card h3{
      margin:0;
      font-size:19px;
      font-family:'Georgia','Times New Roman',serif;
      color:#111827;
    }
    .section-card header span{
      font-size:11px;
      color:${primaryColor};
      text-transform:uppercase;
      font-weight:700;
      letter-spacing:.08em;
    }
    .section-card p{margin:0 0 8px;color:#6b7280;font-size:13px}
    .section-card ul{margin:0;padding:0;list-style:none;display:grid;gap:7px}
    .section-card li{
      display:grid;
      grid-template-columns:1fr auto;
      align-items:center;
      gap:8px;
      border:1px solid #f0e4ec;
      border-radius:10px;
      padding:7px 9px;
      background:#fff;
      font-size:13px;
    }
    .section-card li small{
      color:${presetAccent};
      text-transform:uppercase;
      font-weight:700;
      font-size:11px;
      letter-spacing:.06em;
    }
    .footer-note{
      margin-top:14px;
      text-align:center;
      color:#6b7280;
      font-size:12px;
      letter-spacing:.03em;
    }
    @media (max-width:760px){
      .hero-grid{grid-template-columns:1fr}
      .overview-grid{grid-template-columns:1fr}
      .toolbar-panel{display:block}
      .toolbar-copy{margin-bottom:8px}
      .actions{justify-content:flex-start}
    }
    @media print{
      .toolbar-panel{display:none}
      body{background:#fff}
      .page{max-width:100%;padding:0}
      .hero{border-radius:0;box-shadow:none}
      .hero-grid,.overview-grid{grid-template-columns:1fr}
      .design-sheet{break-after:page; page-break-after:always}
      .section-list{grid-template-columns:${layoutMode === 'list' ? '1fr' : '1fr 1fr'}}
      .page::before{opacity:${showWatermark ? '.2' : '0'}}
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-main">
          ${logoHtml}
          <p class="eyebrow">${escapeHtml(theme.eyebrowText)}</p>
          <h1>${escapeHtml(payload.title)}</h1>
          ${payload.subtitle ? `<p>${escapeHtml(payload.subtitle)}</p>` : ''}
          ${metaHtml}
          ${generatedStampHtml}
        </div>
        <aside class="hero-side">
          <section class="hero-side-card">
            <h4>Estado del dossier</h4>
            <div class="hero-score">
              <strong>${escapeHtml(report.coverageScore)}/100</strong>
              <p>Cobertura operativa estimada para presentacion y ejecucion del evento.</p>
            </div>
          </section>
          <section class="hero-side-card">
            <h4>Resumen rapido</h4>
            <div class="hero-mini-grid">
              <article><p>Secciones</p><strong>${escapeHtml(payload.sections.length)}</strong></article>
              <article><p>Campos</p><strong>${escapeHtml(totalFieldsCount)}</strong></article>
              <article><p>Cubiertos</p><strong>${escapeHtml(report.covered.length)}</strong></article>
              <article><p>Riesgo</p><strong>${escapeHtml(report.riskLevel)}</strong></article>
            </div>
          </section>
        </aside>
      </div>
    </section>
    <section class="toolbar-panel">
      <p class="toolbar-copy">Vista premium para revisar estructura, cobertura operativa y composicion visual antes de exportar.</p>
      <div class="actions">
        <button class="btn" onclick="window.close()">Cerrar</button>
        <button class="btn primary" onclick="window.print()">Exportar PDF</button>
      </div>
    </section>
    <section class="overview-grid">
      <section class="report-box">
        <h2>Informe ejecutivo del evento</h2>
        <div class="report-grid">
          <article><p>Cobertura total</p><strong>${escapeHtml(report.coverageScore)}%</strong></article>
          <article><p>Nivel de riesgo</p><strong>${escapeHtml(report.riskLevel)}</strong></article>
          <article><p>Bloques cubiertos</p><strong>${escapeHtml(report.covered.join(', ') || 'Base')}</strong></article>
          <article><p>Bloques pendientes</p><strong>${escapeHtml(report.missing.join(', ') || 'Ninguno')}</strong></article>
        </div>
        <p class="report-copy">${escapeHtml(report.recommendation)}</p>
      </section>
      ${tocHtml}
    </section>
    ${freeLayoutSheetHtml}
    <section class="section-list">${sectionsHtml}</section>
    <p class="footer-note">${escapeHtml(footerText)}</p>
  </main>
</body>
</html>`;

  try {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  } catch {
    return false;
  }
  return true;
}

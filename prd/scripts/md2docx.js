#!/usr/bin/env node
/*
 * md2docx.js - converts a restricted Markdown subset into a .docx file.
 * Zero dependencies: builds the OOXML package and the ZIP container by hand.
 *
 * Usage: node md2docx.js <input.md> <output.docx> [document title]
 *
 * Supported Markdown:
 *   # / ## / ###      headings (# renders with the Title style)
 *   paragraphs        blank-line separated
 *   - item / * item   bullet list (two-space indent = second level)
 *   1. item           numbered list
 *   | a | b |         table, second row of dashes is the header separator
 *   > quote           call-out paragraph
 *   ---               horizontal rule
 *   **bold**  *italic*  `code`  [text](url)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ------------------------------------------------------------------ ZIP */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

// files: [{ name, data: Buffer }]
function buildZip(files) {
  const { time, day } = dosDateTime(new Date());
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const raw = file.data;
    const deflated = zlib.deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const body = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);

    locals.push(local, body);
    centrals.push(central);
    offset += local.length + body.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBuf, end]);
}

/* ------------------------------------------------------------- Markdown */

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Splits inline markup into runs. Returns OOXML run elements.
function inlineRuns(text, baseProps) {
  const props = baseProps || '';
  const out = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m;

  const plain = (chunk, extra) => {
    if (!chunk) return;
    const rpr = props + (extra || '');
    const parts = chunk.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) out.push('<w:r><w:br/></w:r>');
      if (part) {
        out.push(
          '<w:r>' + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') +
          '<w:t xml:space="preserve">' + esc(part) + '</w:t></w:r>'
        );
      }
    });
  };

  while ((m = pattern.exec(text)) !== null) {
    plain(text.slice(last, m.index));
    if (m[1]) {
      plain(
        m[1].slice(1, -1),
        '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/><w:shd w:val="clear" w:fill="F2F2F2"/>'
      );
    } else if (m[2]) {
      plain(m[2].slice(2, -2), '<w:b/>');
    } else if (m[3]) {
      plain(m[3].slice(1, -1), '<w:i/>');
    } else if (m[4]) {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(m[4]);
      plain(link[1] + ' (' + link[2] + ')', '<w:color w:val="1F4E79"/>');
    }
    last = pattern.lastIndex;
  }
  plain(text.slice(last));
  return out.join('');
}

function para(text, style, extraPr) {
  const pPr =
    '<w:pPr>' + (style ? '<w:pStyle w:val="' + style + '"/>' : '') + (extraPr || '') + '</w:pPr>';
  return '<w:p>' + pPr + inlineRuns(text) + '</w:p>';
}

function listItem(text, numId, level) {
  const pPr =
    '<w:pPr><w:pStyle w:val="ListParagraph"/>' +
    '<w:numPr><w:ilvl w:val="' + level + '"/><w:numId w:val="' + numId + '"/></w:numPr>' +
    '</w:pPr>';
  return '<w:p>' + pPr + inlineRuns(text) + '</w:p>';
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function tableXml(rows) {
  const cols = rows[0].length;
  const width = Math.floor(9350 / cols);

  const cell = (text, isHeader) => {
    const shd = isHeader ? '<w:shd w:val="clear" w:fill="EDF2F7"/>' : '';
    const runs = inlineRuns(text, isHeader ? '<w:b/>' : '');
    return (
      '<w:tc><w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/>' + shd +
      '<w:vAlign w:val="center"/></w:tcPr>' +
      '<w:p><w:pPr><w:pStyle w:val="TableText"/></w:pPr>' + runs + '</w:p></w:tc>'
    );
  };

  const body = rows
    .map((cells, i) => {
      const padded = cells.slice(0, cols);
      while (padded.length < cols) padded.push('');
      const trPr = i === 0 ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
      return '<w:tr>' + trPr + padded.map((c) => cell(c, i === 0)).join('') + '</w:tr>';
    })
    .join('');

  const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((s) => '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="C8CDD4"/>')
    .join('');

  return (
    '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/>' +
    '<w:tblBorders>' + borders + '</w:tblBorders></w:tblPr>' +
    '<w:tblGrid>' + Array(cols).fill('<w:gridCol w:w="' + width + '"/>').join('') + '</w:tblGrid>' +
    body + '</w:tbl>' +
    '<w:p><w:pPr><w:spacing w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p>'
  );
}

function markdownToBody(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  let paragraph = [];

  const flush = () => {
    if (paragraph.length) {
      out.push(para(paragraph.join('\n')));
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      i++;
      continue;
    }

    // table: header row followed by a dash separator row
    if (/^\|/.test(trimmed) && i + 1 < lines.length && /^\|[\s:|-]+\|?$/.test(lines[i + 1].trim())) {
      flush();
      const rows = [splitRow(trimmed)];
      i += 2;
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      out.push(tableXml(rows));
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flush();
      const level = heading[1].length;
      out.push(para(heading[2], level === 1 ? 'Title' : 'Heading' + (level - 1)));
      i++;
      continue;
    }

    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      flush();
      out.push(
        '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="C8CDD4"/></w:pBdr>' +
        '<w:spacing w:before="120" w:after="180"/></w:pPr></w:p>'
      );
      i++;
      continue;
    }

    const bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      flush();
      out.push(listItem(bullet[2], 1, Math.min(1, Math.floor(bullet[1].length / 2))));
      i++;
      continue;
    }

    const numbered = /^(\s*)\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flush();
      out.push(listItem(numbered[2], 2, Math.min(1, Math.floor(numbered[1].length / 2))));
      i++;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flush();
      out.push(para(trimmed.replace(/^>\s?/, ''), 'Quote'));
      i++;
      continue;
    }

    paragraph.push(trimmed);
    i++;
  }

  flush();
  return out.join('');
}

/* ------------------------------------------------------------ OOXML parts */

const CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
'<Default Extension="xml" ContentType="application/xml"/>' +
'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
'<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
'<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
'<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
'<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
'</Types>';

const ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
'</Relationships>';

const DOC_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
'</Relationships>';

const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
'<w:docDefaults><w:rPrDefault><w:rPr>' +
'<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>' +
'<w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="ru-RU"/>' +
'</w:rPr></w:rPrDefault>' +
'<w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault>' +
'</w:docDefaults>' +
'<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
'<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/>' +
'<w:pPr><w:spacing w:before="0" w:after="200"/></w:pPr>' +
'<w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="14213D"/></w:rPr></w:style>' +
'<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>' +
'<w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/>' +
'<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="C8CDD4"/></w:pBdr></w:pPr>' +
'<w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="14213D"/></w:rPr></w:style>' +
'<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/>' +
'<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="100"/></w:pPr>' +
'<w:rPr><w:b/><w:sz w:val="23"/><w:color w:val="1F4E79"/></w:rPr></w:style>' +
'<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/>' +
'<w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/></w:pPr>' +
'<w:rPr><w:b/><w:sz w:val="21"/><w:color w:val="333333"/></w:rPr></w:style>' +
'<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/>' +
'<w:pPr><w:spacing w:after="60"/><w:ind w:left="360"/><w:contextualSpacing/></w:pPr></w:style>' +
'<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/>' +
'<w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>' +
'<w:rPr><w:sz w:val="19"/></w:rPr></w:style>' +
'<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/>' +
'<w:pPr><w:ind w:left="360"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="1F4E79"/></w:pBdr></w:pPr>' +
'<w:rPr><w:i/><w:color w:val="444444"/></w:rPr></w:style>' +
'</w:styles>';

const NUMBERING = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
'<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>' +
'<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/>' +
'<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="240"/></w:pPr>' +
'<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl>' +
'<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#9702;"/>' +
'<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="240"/></w:pPr>' +
'<w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:hint="default"/></w:rPr></w:lvl>' +
'</w:abstractNum>' +
'<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>' +
'<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/>' +
'<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="240"/></w:pPr></w:lvl>' +
'<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2)"/>' +
'<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="240"/></w:pPr></w:lvl>' +
'</w:abstractNum>' +
'<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
'<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>' +
'</w:numbering>';

function coreXml(title) {
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"' +
    ' xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"' +
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '<dc:title>' + esc(title) + '</dc:title>' +
    '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created>' +
    '<dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
    '</cp:coreProperties>';
}

const APP_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
'<Application>md2docx</Application></Properties>';

function documentXml(body) {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    body +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>' +
    '</w:sectPr></w:body></w:document>';
}

/* ----------------------------------------------------------------- main */

function main() {
  const [input, output, ...titleParts] = process.argv.slice(2);
  if (!input || !output) {
    console.error('Usage: node md2docx.js <input.md> <output.docx> [title]');
    process.exit(1);
  }

  const md = fs.readFileSync(input, 'utf8').replace(/^﻿/, '');
  const firstHeading = /^#\s+(.+)$/m.exec(md);
  const title =
    titleParts.join(' ') || (firstHeading && firstHeading[1]) || path.basename(output, '.docx');

  const files = [
    { name: '[Content_Types].xml', data: Buffer.from(CONTENT_TYPES, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(ROOT_RELS, 'utf8') },
    { name: 'docProps/core.xml', data: Buffer.from(coreXml(title), 'utf8') },
    { name: 'docProps/app.xml', data: Buffer.from(APP_XML, 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(documentXml(markdownToBody(md)), 'utf8') },
    { name: 'word/styles.xml', data: Buffer.from(STYLES, 'utf8') },
    { name: 'word/numbering.xml', data: Buffer.from(NUMBERING, 'utf8') },
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(DOC_RELS, 'utf8') },
  ];

  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, buildZip(files));
  console.log(path.resolve(output));
}

main();

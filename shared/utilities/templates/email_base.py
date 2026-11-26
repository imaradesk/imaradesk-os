"""
Shared email design for ImaraDesk cloud.

One shell for every mail: a plain white page with a background-free title
header, a 600px body with generous padding, and a quiet footer. Colors are flat (no
gradients) and come from the app theme (frontend/src/constants/theme.js).

Why a Python builder and not Django ``{% extends %}``:
cloud mail never goes through the Django template engine. Every sender
uses ``{{token}}`` string replacement, so the "base template that the
rest extend" is this builder: each template passes inner HTML in and
the builder wraps it in the shared shell. The wrapper introduces no new
``{{tokens}}`` of its own beyond the ones documented per function, so
existing contexts keep working.

Styles are inlined on every element (many clients drop <style>); the
<style> block only adds responsive tweaks and styles the legacy classes
used by backoffice marketing templates.
"""
from html import escape

SUPPORT_EMAIL = "support@imaradesk.com"

# Palette -- matches the app's dark green theme
PRIMARY_COLOR = "#0B3D26"
PRIMARY_HOVER = "#14502F"
PRIMARY_DARK = "#072618"
PRIMARY_SOFT = "#FFFFFF"       # panels (white, outlined by PRIMARY_LINE)
PRIMARY_LINE = "#D5E5DA"       # borders on tinted panels
ON_PRIMARY_MUTED = "#6B746F"   # eyebrow text above the title
TEXT_DARK = "#1C2420"
TEXT_BODY = "#38423D"
TEXT_MUTED = "#6B746F"
PAGE_BG = "#FFFFFF"
CARD_BORDER = "#E3E7E3"
WARN_BG = "#FFFFFF"
WARN_LINE = "#E9D9AE"
WARN_TEXT = "#6B4E0F"
TINT_BG = "#F3F8F5"            # soft green panels in marketing mail
ACCENT = "#F26A21"             # brand orange (logo / banner underline)
PLACEHOLDER_BG = "#EAF2ED"
PLACEHOLDER_LINE = "#B9D3C2"

FONT_STACK = ("-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, "
              "'Helvetica Neue', Arial, sans-serif")
MONO_STACK = "'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace"

BASE_CSS = """\
body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: """ + FONT_STACK + """; font-size: 15px; line-height: 1.65; color: """ + TEXT_BODY + """; background-color: """ + PAGE_BG + """; }
table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; max-width: 100%; }
a { color: """ + PRIMARY_COLOR + """; text-decoration: underline; text-underline-offset: 2px; }
p { margin: 0 0 16px 0; }
.btn-link:hover { background-color: """ + PRIMARY_HOVER + """ !important; }

/* Legacy classes (backoffice marketing templates) */
.container { max-width: 600px; margin: 32px auto; }
.email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
.header { padding: 22px 32px; background-color: #ffffff; text-align: left; }
.header img { height: 28px; display: block; }
.header-title { margin: 0; font-size: 20px; font-weight: 600; color: """ + TEXT_DARK + """; line-height: 28px; }
.content { padding: 32px; color: """ + TEXT_BODY + """; font-size: 15px; }
.content p { margin: 0 0 16px 0; }
.content h2 { color: """ + TEXT_DARK + """; font-size: 20px; font-weight: 600; line-height: 28px; margin: 0 0 14px 0; letter-spacing: -0.2px; }
.content h3 { color: """ + TEXT_DARK + """; font-size: 16px; font-weight: 600; margin: 24px 0 8px 0; }
.footer { padding: 20px 36px 24px 36px; border-top: 0; color: """ + TEXT_MUTED + """; font-size: 12px; line-height: 1.6; text-align: left; background-color: #ffffff; }
.footer p { margin: 0 0 2px 0; color: """ + TEXT_MUTED + """; font-size: 12px; }
.footer a { color: """ + TEXT_MUTED + """; }
.button, .btn, .cta-button, .reset-button { display: inline-block; background-color: """ + PRIMARY_COLOR + """; color: #ffffff !important; padding: 13px 26px; text-align: center; border-radius: 8px; text-decoration: none !important; font-weight: 600; font-size: 15px; }
.welcome { font-size: 22px; font-weight: 600; margin-bottom: 20px; color: """ + TEXT_DARK + """; }
.security-note { margin: 24px 0; padding: 14px 16px; border-radius: 10px; background-color: """ + WARN_BG + """; border: 1px solid """ + WARN_LINE + """; color: """ + WARN_TEXT + """; font-size: 14px; }
.credentials-box { margin: 24px 0; padding: 18px 20px; border: 1px solid """ + PRIMARY_LINE + """; border-radius: 10px; background-color: """ + PRIMARY_SOFT + """; font-size: 14px; }
.credentials-label { font-weight: 600; color: """ + TEXT_MUTED + """; }
.otp-box, .reset-box { margin: 24px 0; padding: 24px; text-align: center; background-color: """ + PRIMARY_SOFT + """; border: 1px solid """ + PRIMARY_LINE + """; border-radius: 12px; }
.otp-code { font-family: """ + MONO_STACK + """; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: """ + PRIMARY_COLOR + """; margin-bottom: 8px; }
.otp-expires, .expires-note { font-size: 13px; color: """ + TEXT_MUTED + """; margin-top: 10px; }
.alternative-link { margin-top: 16px; font-size: 13px; color: """ + TEXT_MUTED + """; word-break: break-all; }
.divider { height: 1px; background-color: """ + CARD_BORDER + """; margin: 28px 0; }
.code { font-family: """ + MONO_STACK + """; font-size: 24px; font-weight: 700; color: """ + TEXT_DARK + """; margin: 16px 0; }
.info-text { color: """ + TEXT_MUTED + """; margin: 16px 0; }
.feature-list { padding-left: 20px; margin: 16px 0; }
.feature-list li { padding: 4px 0; color: """ + TEXT_BODY + """; }
.highlight-box { background-color: """ + PRIMARY_SOFT + """; border: 1px solid """ + PRIMARY_LINE + """; padding: 16px 18px; margin: 20px 0; border-radius: 10px; }
.btn-container { text-align: left; margin: 28px 0; }

@media only screen and (max-width: 620px) {
  .shell-pad { padding: 16px 10px !important; }
  .card { border-radius: 12px !important; }
  .band, .header { padding: 20px 22px !important; }
  .band-title { font-size: 19px !important; line-height: 26px !important; }
  .body-pad, .content { padding: 24px 22px !important; }
  .footer-pad, .footer { padding-left: 22px !important; padding-right: 22px !important; }
  .detail-key, .detail-val { display: block !important; width: 100% !important; padding: 0 !important; }
  .detail-key { padding-top: 10px !important; }
  .detail-val { padding-bottom: 10px !important; }
  .btn-table { width: 100% !important; }
  .btn-link { display: block !important; text-align: center !important; }
  .code-text { font-size: 26px !important; letter-spacing: 6px !important; }
  .container { margin: 12px !important; }
  .col { display: block !important; width: 100% !important; box-sizing: border-box !important; }
  .card-cell { margin-bottom: 12px !important; }
  .gap { display: none !important; }
  .banner-cell { padding: 0 !important; }
}
"""

# Marker so Mailer can tell new-shell documents from legacy full documents
SHELL_MARKER = "data-imara-shell"


def _shell(head_title, eyebrow, title, body_inner, footer_inner, preheader="", banner_html=""):
    """Assemble the full HTML doc. Args are raw HTML strings that may hold
    {{tokens}} -- concatenated, never parsed. banner_html (see banner())
    sits above the title band."""
    hidden_preheader = ""
    if preheader:
        hidden_preheader = (
            "<div style=\"display:none; max-height:0; overflow:hidden; opacity:0; "
            "mso-hide:all;\">" + preheader + "</div>\n"
        )
    eyebrow_row = ""
    if eyebrow:
        eyebrow_row = (
            "<p style=\"margin:0 0 6px 0; font-size:12px; font-weight:600; letter-spacing:0.6px; "
            "text-transform:uppercase; color:" + ON_PRIMARY_MUTED + ";\">" + eyebrow + "</p>\n"
        )
    return (
        "<!DOCTYPE html>\n<html lang=\"en\" " + SHELL_MARKER + ">\n<head>\n"
        "<meta charset=\"UTF-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
        "<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n"
        "<meta name=\"color-scheme\" content=\"light\">\n"
        "<meta name=\"supported-color-schemes\" content=\"light\">\n"
        "<title>" + head_title + "</title>\n"
        "<style>\n" + BASE_CSS + "</style>\n</head>\n"
        "<body style=\"margin:0; padding:0; background-color:" + PAGE_BG + "; font-family:" + FONT_STACK + "; "
        "color:" + TEXT_BODY + ";\">\n"
        + hidden_preheader +
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"100%\" "
        "style=\"background-color:" + PAGE_BG + ";\">\n"
        "<tr><td align=\"center\" class=\"shell-pad\" style=\"padding:36px 16px;\">\n"
        # Card
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"600\" class=\"card\" "
        "style=\"width:100%; max-width:600px; background-color:#ffffff; border:0; "
        "border-collapse:separate;\">\n"
        + banner_html +
        # Title band
        "<tr><td class=\"band\" style=\"background-color:#ffffff; padding:26px 36px 0 36px; text-align:left;\">\n"
        + eyebrow_row +
        "<h1 class=\"band-title\" style=\"margin:0; font-size:21px; line-height:29px; font-weight:600; "
        "letter-spacing:-0.2px; color:" + TEXT_DARK + ";\">" + title + "</h1>\n"
        "</td></tr>\n"
        # Body
        "<tr><td class=\"body-pad\" style=\"padding:32px 36px 12px 36px; font-size:15px; line-height:1.65; "
        "color:" + TEXT_BODY + "; text-align:left;\">\n"
        + body_inner +
        "\n</td></tr>\n"
        "</table>\n"
        # Footer, below the card
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"600\" "
        "style=\"width:100%; max-width:600px;\">\n"
        "<tr><td class=\"footer-pad\" style=\"padding:20px 36px 0 36px; font-size:12px; line-height:1.6; "
        "color:" + TEXT_MUTED + "; text-align:left;\">\n"
        + footer_inner +
        "\n</td></tr>\n</table>\n"
        "</td></tr>\n</table>\n</body>\n</html>"
    )


def _support_footer(company_token=None):
    """Footer for system mail: the same sign-off every email uses."""
    return signoff_html(company_token or "Imaradesk")


# ---------------------------------------------------------------------------
# Building blocks. All return inline-styled HTML fragments. Arguments are
# inserted verbatim so callers can pass {{tokens}} or trusted HTML.
# ---------------------------------------------------------------------------

def greeting(text):
    """Opening line, e.g. greeting("Hi {{user_name}},")."""
    return "<p style=\"margin:0 0 16px 0; font-size:16px; color:" + TEXT_DARK + ";\">" + text + "</p>\n"


def paragraph(html, muted=False, small=False):
    color = TEXT_MUTED if muted else TEXT_BODY
    size = "13px" if small else "15px"
    return "<p style=\"margin:0 0 16px 0; font-size:" + size + "; line-height:1.65; color:" + color + ";\">" + html + "</p>\n"


def heading(text):
    """Section heading inside the body."""
    return (
        "<h2 style=\"margin:28px 0 10px 0; font-size:16px; line-height:24px; font-weight:600; "
        "color:" + TEXT_DARK + ";\">" + text + "</h2>\n"
    )


def button(url, label, align="left"):
    """Bulletproof button (table-based so Outlook keeps padding)."""
    return (
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" class=\"btn-table\" "
        "align=\"" + align + "\" style=\"margin:8px 0 24px 0;\">\n"
        "<tr><td style=\"border-radius:8px; background-color:" + PRIMARY_COLOR + ";\">\n"
        "<a href=\"" + url + "\" class=\"btn-link\" target=\"_blank\" style=\"display:inline-block; padding:13px 26px; "
        "font-size:15px; font-weight:600; line-height:20px; color:#ffffff; text-decoration:none; border-radius:8px; "
        "background-color:" + PRIMARY_COLOR + ";\">" + label + "</a>\n"
        "</td></tr>\n</table>\n"
        "<div style=\"clear:both; line-height:0; font-size:0;\">&nbsp;</div>\n"
    )


def details(rows, title=None):
    """Key/value panel. rows: list of (label, value_html) tuples."""
    head = ""
    if title:
        head = (
            "<tr><td colspan=\"2\" style=\"padding:0 0 8px 0; font-size:12px; font-weight:600; letter-spacing:0.5px; "
            "text-transform:uppercase; color:" + PRIMARY_COLOR + ";\">" + title + "</td></tr>\n"
        )
    body = ""
    for i, (label, value) in enumerate(rows):
        border = "" if i == len(rows) - 1 else "border-bottom:1px solid " + PRIMARY_LINE + ";"
        body += (
            "<tr>"
            "<td class=\"detail-key\" valign=\"top\" style=\"padding:10px 16px 10px 0; width:38%; font-size:13px; "
            "color:" + TEXT_MUTED + "; " + border + "\">" + label + "</td>"
            "<td class=\"detail-val\" valign=\"top\" style=\"padding:10px 0; font-size:14px; font-weight:600; "
            "color:" + TEXT_DARK + "; word-break:break-word; " + border + "\">" + value + "</td>"
            "</tr>\n"
        )
    return (
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"100%\" "
        "style=\"margin:8px 0 24px 0; background-color:" + PRIMARY_SOFT + "; border:1px solid " + PRIMARY_LINE + "; "
        "border-radius:10px; border-collapse:separate;\">\n"
        "<tr><td style=\"padding:14px 20px;\">\n"
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"100%\">\n"
        + head + body +
        "</table>\n</td></tr>\n</table>\n"
    )


def code_box(code, caption=""):
    """Large one-time code, centered in a tinted panel."""
    cap = ""
    if caption:
        cap = "<p style=\"margin:10px 0 0 0; font-size:13px; color:" + TEXT_MUTED + ";\">" + caption + "</p>\n"
    return (
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"100%\" "
        "style=\"margin:8px 0 24px 0; background-color:" + PRIMARY_SOFT + "; border:1px solid " + PRIMARY_LINE + "; "
        "border-radius:12px; border-collapse:separate;\">\n"
        "<tr><td align=\"center\" style=\"padding:24px 16px;\">\n"
        "<p class=\"code-text\" style=\"margin:0; font-family:" + MONO_STACK + "; font-size:32px; line-height:40px; "
        "font-weight:700; letter-spacing:8px; color:" + PRIMARY_COLOR + ";\">" + code + "</p>\n"
        + cap +
        "</td></tr>\n</table>\n"
    )


def note(html, tone="info"):
    """Quiet callout. tone: 'info' (green tint) or 'warning' (sand)."""
    if tone == "warning":
        bg, line, color = WARN_BG, WARN_LINE, WARN_TEXT
    else:
        bg, line, color = PRIMARY_SOFT, PRIMARY_LINE, TEXT_BODY
    return (
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"100%\" "
        "style=\"margin:8px 0 24px 0; background-color:" + bg + "; border:1px solid " + line + "; "
        "border-radius:10px; border-collapse:separate;\">\n"
        "<tr><td style=\"padding:14px 18px; font-size:14px; line-height:1.6; color:" + color + ";\">" + html + "</td></tr>\n"
        "</table>\n"
    )


def quote(html):
    """Quoted message or comment, e.g. a customer's reply."""
    return (
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"100%\" style=\"margin:8px 0 24px 0;\">\n"
        "<tr><td style=\"border-left:3px solid " + PRIMARY_LINE + "; padding:4px 0 4px 16px; font-size:15px; "
        "line-height:1.65; color:" + TEXT_BODY + ";\">" + html + "</td></tr>\n</table>\n"
    )


def bullet_list(items):
    lis = "".join(
        "<li style=\"margin:0 0 8px 0; padding-left:4px;\">" + item + "</li>\n" for item in items
    )
    return "<ul style=\"margin:0 0 20px 0; padding-left:20px; color:" + TEXT_BODY + "; font-size:15px; line-height:1.6;\">\n" + lis + "</ul>\n"


def link_fallback(url):
    """'Button not working?' line with the raw URL."""
    return (
        "<p style=\"margin:0 0 16px 0; font-size:13px; line-height:1.6; color:" + TEXT_MUTED + ";\">"
        "If the button doesn't work, copy this link into your browser:<br>"
        "<a href=\"" + url + "\" style=\"color:" + PRIMARY_COLOR + "; word-break:break-all;\">" + url + "</a></p>\n"
    )


def divider():
    return (
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"100%\" style=\"margin:8px 0 24px 0;\">"
        "<tr><td style=\"border-top:1px solid " + CARD_BORDER + "; font-size:0; line-height:0;\">&nbsp;</td></tr></table>\n"
    )


def signoff(html):
    """Closing lines, e.g. signoff("Thanks,<br>The Imaradesk team")."""
    return "<p style=\"margin:24px 0 20px 0; font-size:15px; line-height:1.6; color:" + TEXT_BODY + ";\">" + html + "</p>\n"


def text(value):
    """Escape a plain (non-token) string for use inside the blocks above."""
    return escape(value, quote=True)


# ---------------------------------------------------------------------------
# Marketing blocks (welcome / product mail)
# ---------------------------------------------------------------------------

def banner(src, alt, href=None):
    """Full-width hero image row for _shell(banner_html=...). Width is fixed at
    600 so Outlook doesn't render the source image at its natural size."""
    img = (
        "<img src=\"" + src + "\" alt=\"" + alt + "\" width=\"600\" "
        "style=\"display:block; width:100%; max-width:600px; height:auto; border:0; "
        "border-radius:12px;\">"
    )
    if href:
        img = "<a href=\"" + href + "\" target=\"_blank\" style=\"display:block;\">" + img + "</a>"
    return "<tr><td class=\"banner-cell\" style=\"padding:0 0 4px 0; line-height:0; font-size:0;\">" + img + "</td></tr>\n"


def media(src, alt, size, label, radius="10px"):
    """An <img> when src is set, otherwise a dashed placeholder box of the same
    size so the layout is final before the artwork exists.
    size: (width, height) in px; width may be "100%" for full-width images."""
    width, height = size
    css_width = width if isinstance(width, str) else str(width) + "px"
    if src:
        attr_width = "" if isinstance(width, str) else " width=\"" + str(width) + "\""
        return (
            "<img src=\"" + src + "\" alt=\"" + alt + "\"" + attr_width + " "
            "style=\"display:block; width:" + css_width + "; max-width:100%; height:auto; border:0; "
            "border-radius:" + radius + ";\">"
        )
    return (
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" "
        "style=\"width:" + css_width + "; border-collapse:separate;\">"
        "<tr><td align=\"center\" valign=\"middle\" height=\"" + str(height) + "\" "
        "style=\"height:" + str(height) + "px; background-color:" + PLACEHOLDER_BG + "; "
        "border:1px dashed " + PLACEHOLDER_LINE + "; border-radius:" + radius + "; "
        "font-size:10px; line-height:12px; font-weight:600; letter-spacing:0.4px; text-transform:uppercase; "
        "color:" + PRIMARY_COLOR + ";\">" + label + "</td></tr></table>"
    )


def section(eyebrow, title, intro=""):
    """Section opener: small orange eyebrow, bold title, optional intro line."""
    out = (
        "<p style=\"margin:36px 0 6px 0; font-size:12px; font-weight:700; letter-spacing:0.8px; "
        "text-transform:uppercase; color:" + ACCENT + ";\">" + eyebrow + "</p>\n"
        "<h2 style=\"margin:0 0 8px 0; font-size:20px; line-height:28px; font-weight:700; "
        "letter-spacing:-0.2px; color:" + TEXT_DARK + ";\">" + title + "</h2>\n"
    )
    if intro:
        out += "<p style=\"margin:0 0 18px 0; font-size:15px; line-height:1.65; color:" + TEXT_BODY + ";\">" + intro + "</p>\n"
    return out


def _card(item, icon_size):
    """Inner HTML of one grid card: icon/image, title, text, optional link."""
    link = ""
    if item.get("link"):
        href, label = item["link"]
        link = (
            "<p style=\"margin:10px 0 0 0; font-size:13px; font-weight:600;\">"
            "<a href=\"" + href + "\" target=\"_blank\" style=\"color:" + PRIMARY_COLOR + "; text-decoration:none;\">"
            + label + " &rarr;</a></p>"
        )
    return (
        media(item.get("icon"), item["title"], icon_size, "Icon") +
        "<p style=\"margin:14px 0 4px 0; font-size:15px; line-height:22px; font-weight:700; color:" + TEXT_DARK + ";\">"
        + item["title"] + "</p>"
        "<p style=\"margin:0; font-size:14px; line-height:1.55; color:" + TEXT_BODY + ";\">" + item["text"] + "</p>"
        + link
    )


def feature_grid(items, columns=2, icon_size=(44, 44)):
    """Responsive card grid (stacks to one column on phones).
    items: dicts with title, text, optional icon (image URL; None shows a
    placeholder) and optional link=(href, label).

    The cells themselves are the cards, so cards in a row share a height;
    "gap" cells/rows provide spacing and are hidden on phones."""
    gap = 12
    width = str(round((100 - (columns - 1) * 2.2) / columns, 1)) + "%"
    card_css = ("background-color:" + TINT_BG + "; border:1px solid " + PRIMARY_LINE + "; "
                "border-radius:12px; padding:18px;")
    gap_cell = "<td class=\"gap\" width=\"" + str(gap) + "\" style=\"width:" + str(gap) + "px; font-size:0; line-height:0;\">&nbsp;</td>"
    rows = []
    for start in range(0, len(items), columns):
        chunk = items[start:start + columns]
        cells = []
        for i in range(columns):
            if i < len(chunk):
                cells.append(
                    "<td class=\"col card-cell\" valign=\"top\" width=\"" + width + "\" "
                    "style=\"width:" + width + "; " + card_css + "\">" + _card(chunk[i], icon_size) + "</td>"
                )
            else:
                cells.append("<td class=\"col gap\" width=\"" + width + "\" style=\"width:" + width + ";\">&nbsp;</td>")
        rows.append("<tr>" + gap_cell.join(cells) + "</tr>\n")
    row_gap = ("<tr class=\"gap\"><td colspan=\"" + str(columns * 2 - 1) + "\" height=\"" + str(gap) + "\" "
               "style=\"height:" + str(gap) + "px; font-size:0; line-height:0;\">&nbsp;</td></tr>\n")
    return (
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"100%\" "
        "style=\"margin:4px 0 24px 0; border-collapse:separate;\">\n" + row_gap.join(rows) + "</table>\n"
    )


def spotlight(title, text_html, image=None, image_label="Image 520 &times; 240", cta=None):
    """Large image (or placeholder) over a short pitch, in a tinted panel.
    cta: optional (href, label)."""
    link = ""
    if cta:
        link = (
            "<p style=\"margin:12px 0 0 0; font-size:14px; font-weight:600;\">"
            "<a href=\"" + cta[0] + "\" target=\"_blank\" style=\"color:" + PRIMARY_COLOR + "; text-decoration:none;\">"
            + cta[1] + " &rarr;</a></p>"
        )
    return (
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"100%\" "
        "style=\"margin:8px 0 24px 0; background-color:" + TINT_BG + "; border:1px solid " + PRIMARY_LINE + "; "
        "border-radius:14px; border-collapse:separate;\">\n"
        "<tr><td style=\"padding:20px 20px 0 20px;\">"
        + media(image, title, ("100%", 220), image_label, radius="10px") +
        "</td></tr>\n"
        "<tr><td style=\"padding:18px 22px 22px 22px;\">"
        "<p style=\"margin:0 0 6px 0; font-size:17px; line-height:24px; font-weight:700; color:" + TEXT_DARK + ";\">"
        + title + "</p>"
        "<p style=\"margin:0; font-size:14px; line-height:1.6; color:" + TEXT_BODY + ";\">" + text_html + "</p>"
        + link +
        "</td></tr>\n</table>\n"
    )


def steps(items):
    """Numbered checklist. items: list of (title, text_html)."""
    rows = ""
    for n, (title, body) in enumerate(items, 1):
        rows += (
            "<tr>"
            "<td valign=\"top\" width=\"40\" style=\"width:40px; padding:0 0 16px 0;\">"
            "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\"><tr>"
            "<td align=\"center\" valign=\"middle\" width=\"28\" height=\"28\" style=\"width:28px; height:28px; "
            "border-radius:14px; background-color:" + PRIMARY_COLOR + "; color:#ffffff; font-size:13px; "
            "font-weight:700; line-height:28px;\">" + str(n) + "</td></tr></table>"
            "</td>"
            "<td valign=\"top\" style=\"padding:3px 0 16px 0;\">"
            "<p style=\"margin:0 0 2px 0; font-size:15px; line-height:22px; font-weight:700; color:" + TEXT_DARK + ";\">"
            + title + "</p>"
            "<p style=\"margin:0; font-size:14px; line-height:1.55; color:" + TEXT_BODY + ";\">" + body + "</p>"
            "</td></tr>\n"
        )
    return (
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"100%\" "
        "style=\"margin:4px 0 8px 0;\">\n" + rows + "</table>\n"
    )


# ---------------------------------------------------------------------------
# Plain-text body -> designed HTML (tenant templates are stored as text)
# ---------------------------------------------------------------------------

import re as _re

_URL_TOKEN = _re.compile(r"^\{\{\s*([a-z0-9_]*url)\s*\}\}$", _re.I)
_BARE_URL = _re.compile(r"^https?://\S+$", _re.I)
_TOKEN_ONLY = _re.compile(r"^\{\{\s*[^}]+\s*\}\}$")
_KEY_VALUE = _re.compile(r"^([^:{}<>]{1,40}):\s+(.+)$")
_GREETING = _re.compile(r"^(hi|hello|hey|dear|good (morning|afternoon|evening))\b.*,$", _re.I)

_BUTTON_LABELS = {
    "survey_url": "Share your feedback",
    "reset_url": "Reset password",
    "login_url": "Log in",
    "ticket_url": "View ticket",
    "task_url": "View task",
    "article_url": "Read article",
    "response_url": "View response",
}


def _url_of(line):
    """Return (href, token_name) if the line is only a URL or a {{*url}} token."""
    m = _URL_TOKEN.match(line)
    if m:
        return line, m.group(1).lower()
    if _BARE_URL.match(line):
        return line, None
    return None, None


def _render_lines(lines):
    """Render one paragraph's lines, splitting out standalone links as buttons."""
    out, buf = [], []

    def flush():
        if buf:
            out.append(paragraph("<br>".join(buf)))
            buf.clear()

    for line in lines:
        href, token = _url_of(line)
        if href:
            flush()
            out.append(button(href, _BUTTON_LABELS.get(token, "Open link")))
            continue
        kv = _KEY_VALUE.match(line)
        if kv and _url_of(kv.group(2).strip())[0]:
            # "View article: {{article_url}}" -> button labelled with the key
            flush()
            out.append(button(kv.group(2).strip(), kv.group(1).strip()))
            continue
        buf.append(line)
    flush()
    return "".join(out)


def text_to_email_html(body):
    """Turn a tenant plain-text template into designed HTML.

    Recognised shapes (anything else becomes a normal paragraph):
      - "Hi {{name}}," opening line            -> greeting
      - 2+ lines of "Label: value"             -> details panel
        (optionally preceded by "Something:")  -> details panel with a title
      - "Comment:" followed by a {{token}}     -> label + quoted block
      - a line that is only a URL / {{*_url}}  -> button
      - "View ticket: {{ticket_url}}"          -> button labelled "View ticket"
    {{tokens}} are left in place for the caller to substitute.
    """
    if not body:
        return ""
    html = []
    paragraphs = _re.split(r"\n\s*\n", body.strip())
    for index, para in enumerate(paragraphs):
        lines = [l.strip() for l in para.strip().split("\n") if l.strip()]
        if not lines:
            continue

        if index == 0 and len(lines) == 1 and _GREETING.match(lines[0]):
            html.append(greeting(lines[0]))
            continue

        title = None
        rows = lines
        if len(lines) >= 3 and lines[0].endswith(":") and not _KEY_VALUE.match(lines[0]):
            title, rows = lines[0][:-1], lines[1:]
        pairs = [_KEY_VALUE.match(l) for l in rows]
        if len(rows) >= 2 and all(pairs) and not any(_url_of(p.group(2).strip())[0] for p in pairs):
            html.append(details([(p.group(1).strip(), p.group(2).strip()) for p in pairs], title=title))
            continue

        if len(lines) == 2 and lines[0].endswith(":") and _TOKEN_ONLY.match(lines[1]) and not _url_of(lines[1])[0]:
            html.append(
                "<p style=\"margin:8px 0 6px 0; font-size:12px; font-weight:600; letter-spacing:0.5px; "
                "text-transform:uppercase; color:" + TEXT_MUTED + ";\">" + lines[0][:-1] + "</p>\n"
            )
            html.append(quote(lines[1]))
            continue

        html.append(_render_lines(lines))
    return "".join(html)


# ---------------------------------------------------------------------------
# Wrappers
# ---------------------------------------------------------------------------

def signoff_html(team_name):
    """'Best regards, / The <team_name> Team' footer block. team_name may be a {{token}}."""
    return (
        "<p style=\"margin:0 0 2px 0; color:" + TEXT_MUTED + ";\">Best regards,</p>\n"
        "<p style=\"margin:0; color:" + TEXT_MUTED + ";\">The " + team_name + " Team</p>"
    )


_SIGNOFF_TAIL = _re.compile(
    r"<p[^>]*>\s*"
    r"(?:(?:Thank you|Thanks|Best regards|Kind regards|Regards)[,!]?\s*(?:<br\s*/?>\s*)?)?"
    r"(?:\{\{\s*company_name\s*\}\}\s*)?Support (?:Team|System)\s*</p>\s*$",
    _re.I,
)


def strip_trailing_signoff(html):
    """Remove a closing '{{company_name}} Support Team' line (and its 'Thank you,'),
    because the footer now carries the sign-off."""
    return _SIGNOFF_TAIL.sub("", html.rstrip()) if html else html


def tenant_base_template(use_business_name=False):
    """Tenant wrapper. Tokens preserved exactly: {{email_title}} {{email_body}} {{company_name}}.

    The footer sign-off reads 'The {{company_name}} Team' when use_business_name
    is on, otherwise 'The Imaradesk Team'."""
    return _shell(
        head_title="{{email_title}}",
        eyebrow="{{company_name}}",
        title="{{email_title}}",
        body_inner="{{email_body}}",
        footer_inner=signoff_html("{{company_name}}" if use_business_name else "Imaradesk"),
    )


def global_base(title, inner_html, preheader="", banner_html=""):
    """System/global wrapper. title is a plain string; inner_html keeps its
    {{tokens}} for Mailer.replace_tokens to fill per-send."""
    return _shell(
        head_title=title,
        eyebrow="",
        title=title,
        body_inner=inner_html,
        footer_inner=_support_footer(),
        preheader=preheader,
        banner_html=banner_html,
    )


def backoffice_styles():
    """CSS for backoffice marketing mails. Keeps every legacy class so the
    existing html_content blocks restyle with zero HTML edits."""
    return BASE_CSS


def backoffice_base(title, inner_html, preview_text=""):
    return _shell(
        head_title=title,
        eyebrow="",
        title=title,
        body_inner=inner_html,
        footer_inner=signoff_html("Imaradesk"),
        preheader=preview_text,
    )

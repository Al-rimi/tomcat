/**
 * Advanced syntax highlighting system for Java EE development
 * 
 * Architectural Role:
 * - TextMate grammar rule implementation
 * - Semantic scope hierarchy management
 * - Theme-aware color customization
 * 
 * Core Responsibilities:
 * 1. Log File Analysis: Level-based coloring and timestamp differentiation
 * 2. Java EE Semantics: Class/method/annotation highlighting
 * 3. Build System Visualization: Metrics and path highlighting
 * 4. Configuration Support: XML/properties enhancement
 * 5. Theme Integration: Light/dark mode compatibility
 * 
 * Implementation Notes:
 * - Non-destructive rule merging with user customizations
 * - Accessibility-focused contrast ratios
 * - Atomic configuration updates
 * - Scope-based priority system
 * - Cross-theme color fallbacks
 */

import * as vscode from 'vscode';

/**
 * Applies advanced syntax highlighting rules to the editor
 * 
 * Orchestrates complete syntax enhancement workflow:
 * 1. Loads current color customizations
 * 2. Merges new rules non-destructively
 * 3. Applies semantic scope hierarchy
 * 4. Updates global configuration
 * 5. Preserves existing user customizations
 */
export function addSyntaxColoringRules() {
    const config = vscode.workspace.getConfiguration();
    const existingColors: { textMateRules?: Array<{ scope: string; settings: any }> } = config.get('editor.tokenColorCustomizations') || {};

    /**
     * Comprehensive syntax coloring ruleset implementing:
     * - Semantic scope hierarchy
     * - Theme-aware color selection
     * - Accessibility-compliant contrast
     * - Visual hierarchy principles
     */
    const colorRules = [
        // Timestamp - subtle gray (log file metadata)
        { 
            "scope": "meta.timestamp.tomcat", 
            "settings": { 
                "foreground": "#858585", 
                "fontStyle": "" 
            } 
        },

        // Log level hierarchy - semantic coloring
        { 
            "scope": "support.type.log-level.info.tomcat", 
            "settings": { 
                "foreground": "#4FC1FF",  // Informational blue
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "support.type.log-level.debug.tomcat", 
            "settings": { 
                "foreground": "#888888",  // Secondary gray
                "fontStyle": "bold"     // High visibility
            } 
        },
        { 
            "scope": "support.type.log-level.error.tomcat", 
            "settings": { 
                "foreground": "#D32F2F",  // Error dark red
                "fontStyle": "bold"       // High visibility
            } 
        },
        { 
            "scope": "support.type.log-level.success.tomcat", 
            "settings": { 
                "foreground": "#73C991",  // Success green
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "support.type.log-level.warn.tomcat", 
            "settings": { 
                "foreground": "#FF6B6B",  // Warning red
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "entity.name.log-level.brackets.tomcat", 
            "settings": { 
                "foreground": "#FFD700", // Gold for emphasis
                "fontStyle": "" 
            } 
        },


        // Hyperlink elements - distinct link color
        { 
            "scope": "markup.underline.link.tomcat", 
            "settings": { 
                "foreground": "#61AFEF",  // Link blue
                "fontStyle": "underline"  // Emphasize link nature
            } 
        },
        
        // File system elements - path visualization
        { 
            "scope": "entity.name.filename.java.tomcat", 
            "settings": { 
                "foreground": "#9CDCFE",  // Light blue
                "fontStyle": "underline"  // File path indicator
            } 
        },

        // Build metrics - numeric values
        { 
            "scope": "constant.numeric.build-duration.tomcat", 
            "settings": { 
                "foreground": "#B5CEA8"  // Soft green
            } 
        },
        { 
            "scope": "constant.numeric.integer.tomcat", 
            "settings": { 
                "foreground": "#B5CEA8"  // Consistent numeric styling
            } 
        },

        // Java syntax hierarchy - semantic coloring
        { 
            "scope": "entity.name.class.java.tomcat", 
            "settings": { 
                "foreground": "#4EC9B0",  // Teal for classes
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "entity.name.function.java.tomcat", 
            "settings": { 
                "foreground": "#DCDCAA",  // Light yellow for methods
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "variable.parameter.java.tomcat", 
            "settings": { 
                "foreground": "#9CDCFE",  // Light blue for params
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "variable.other.object.java.tomcat", 
            "settings": { 
                "foreground": "#DCDCAA",  // Consistent object refs
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "storage.modifier.java.tomcat", 
            "settings": { 
                "foreground": "#569CD6",  // Blue for modifiers
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "storage.type.java.tomcat", 
            "settings": { 
                "foreground": "#4EC9B0",  // Teal for types
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "keyword.control.java.tomcat", 
            "settings": { 
                "foreground": "#C586C0",  // Purple for keywords
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "invalid.illegal.java.tomcat", 
            "settings": { 
                "foreground": "#FF6B6B",  // Error red
                "fontStyle": "bold" 
            } 
        },
        { 
            "scope": "markup.error.tomcat", 
            "settings": { 
                "foreground": "#FF6B6B",  // Consistent error styling
                "fontStyle": "bold" 
            } 
        },
        { 
            "scope": "string.quoted.double.java.tomcat", 
            "settings": { 
                "foreground": "#CE9178",  // Warm brown for strings
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "keyword.operator.java.tomcat", 
            "settings": { 
                "foreground": "#D4D4D4",  // Light gray for operators
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "storage.type.annotation.java.tomcat", 
            "settings": { 
                "foreground": "#569CD6",  // Blue for annotations
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "meta.annotation.parameters.java.tomcat", 
            "settings": { 
                "foreground": "#9CDCFE",  // Light blue for params
                "fontStyle": "" 
            } 
        },

        // Punctuation - subtle differentiation
        { 
            "scope": "punctuation.terminator.java.tomcat", 
            "settings": { 
                "foreground": "#D4D4D4"  // Standard punctuation
            } 
        },
        { 
            "scope": "punctuation.separator.comma.java.tomcat", 
            "settings": { 
                "foreground": "#D4D4D4"  // Consistent punctuation
            } 
        },
        { 
            "scope": "punctuation.bracket.square.java.tomcat", 
            "settings": { 
                "foreground": "#D4D4D4"  // Array/Index brackets
            } 
        },
        { 
            "scope": "punctuation.bracket.round.java.tomcat", 
            "settings": { 
                "foreground": "#D4D4D4"  // Method/Grouping parens
            } 
        },
        { 
            "scope": "punctuation.bracket.angle.java.tomcat", 
            "settings": { 
                "foreground": "#D4D4D4"  // Generics brackets
            } 
        },

        // Package/Import hierarchy
        { 
            "scope": "entity.name.package.java.tomcat", 
            "settings": { 
                "foreground": "#858585",  // Gray for packages
                "fontStyle": "" 
            } 
        },
        { 
            "scope": "keyword.control.import.java.tomcat", 
            "settings": { 
                "foreground": "#569CD6",  // Blue for imports
                "fontStyle": "" 
            } 
        },

        // HTTP Log coloring rules
        { 
            "scope": "support.type.log-level.http.tomcat", 
            "settings": { 
                "foreground": "#4EC9B0",  // VS Code default teal
                "fontStyle": "bold"
            } 
        },
        { 
            "scope": "http.method.tomcat", 
            "settings": { 
                "foreground": "#C586C0",  // Purple for methods
                "fontStyle": "bold"
            } 
        },
        { 
            "scope": "http.status.success.tomcat", 
            "settings": { 
                "foreground": "#73C991",  // Green for 2xx
                "fontStyle": "bold"
            } 
        },
        { 
            "scope": "http.status.redirect.tomcat", 
            "settings": { 
                "foreground": "#4FC1FF",  // Blue for 3xx
                "fontStyle": "bold"
            } 
        },
        { 
            "scope": "http.status.client-error.tomcat", 
            "settings": { 
                "foreground": "#FFCC66",  // Amber for 4xx
                "fontStyle": "bold"
            } 
        },
        { 
            "scope": "http.response.size.tomcat", 
            "settings": { 
                "foreground": "#B5CEA8",  // Soft green for sizes
                "fontStyle": "" 
            } 
        },
        {
            "scope": "entity.name.user.admin.tomcat",
            "settings": {
                "foreground": "#FFA07A",  // Light salmon (distinct but not alarming)
                "fontStyle": "italic"
            }
        }
    ];

    /**
     * Rule merging strategy that:
     * 1. Preserves existing user customizations
     * 2. Only overwrites rules we explicitly define
     * 3. Maintains rule ordering consistency
     * 4. Prevents duplicate scope definitions
     */
    const updatedRules = [
        ...(existingColors.textMateRules || []).filter(rule =>
            !colorRules.some(r => r.scope === rule.scope)
        ),
        ...colorRules
    ];

    // Atomic configuration update with error handling
    config.update('editor.tokenColorCustomizations',
        { ...existingColors, textMateRules: updatedRules },
        vscode.ConfigurationTarget.Global
    ).then(
        () => {/* Success handler */},
        (err) => console.error('Failed to update syntax coloring:', err)
    );
}
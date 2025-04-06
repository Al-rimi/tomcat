import * as vscode from 'vscode';

export function addSyntaxColoringRules() {
    const config = vscode.workspace.getConfiguration();
    const existingColors: { textMateRules?: Array<{ scope: string; settings: any }> } = config.get('editor.tokenColorCustomizations') || {};
    
    const colorRules = [
        // Timestamp - subtle gray
        { "scope": "meta.timestamp.tomcat", "settings": { "foreground": "#858585", "fontStyle": "" }},
        
        // Log levels - cleaner colors
        { "scope": "support.type.log-level.info.tomcat", "settings": { "foreground": "#4FC1FF", "fontStyle": "" }},
        { "scope": "support.type.log-level.debug.tomcat", "settings": { "foreground": "#888888", "fontStyle": "italic" }},
        { "scope": "support.type.log-level.error.tomcat", "settings": { "foreground": "#FF6B6B", "fontStyle": "bold" }},
        { "scope": "support.type.log-level.success.tomcat", "settings": { "foreground": "#73C991", "fontStyle": "" }},
        { "scope": "support.type.log-level.warn.tomcat", "settings": { "foreground": "#FFCC66", "fontStyle": "" }},
        
        // File paths
        { "scope": "entity.name.filename.java", "settings": { "foreground": "#9CDCFE", "fontStyle": "underline" }},
        
        // Build info
        { "scope": "constant.numeric.build-duration.tomcat", "settings": { "foreground": "#B5CEA8" }},
        { "scope": "constant.numeric.integer.tomcat", "settings": { "foreground": "#B5CEA8" }},
        
        // Java syntax
        { "scope": "entity.name.class.java", "settings": { "foreground": "#4EC9B0", "fontStyle": "" }},
        { "scope": "entity.name.function.java", "settings": { "foreground": "#DCDCAA", "fontStyle": "" }},
        { "scope": "variable.parameter.java", "settings": { "foreground": "#9CDCFE", "fontStyle": "" }},
        { "scope": "variable.other.object.java", "settings": { "foreground": "#DCDCAA", "fontStyle": "" }},
        { "scope": "storage.modifier.java", "settings": { "foreground": "#569CD6", "fontStyle": "" }},
        { "scope": "storage.type.java", "settings": { "foreground": "#4EC9B0", "fontStyle": "" }},
        { "scope": "keyword.control.java", "settings": { "foreground": "#C586C0", "fontStyle": "" }},
        { "scope": "invalid.illegal.java", "settings": { "foreground": "#FF6B6B", "fontStyle": "bold" }},
        { "scope": "markup.error", "settings": { "foreground": "#FF6B6B", "fontStyle": "bold" }},
        { "scope": "string.quoted.double.java", "settings": { "foreground": "#CE9178", "fontStyle": "" }},
        { "scope": "keyword.operator.java", "settings": { "foreground": "#D4D4D4", "fontStyle": "" }},
        { "scope": "storage.type.annotation.java", "settings": { "foreground": "#569CD6", "fontStyle": "" }},
        { "scope": "meta.annotation.parameters.java", "settings": { "foreground": "#9CDCFE", "fontStyle": "" }},
        
        // Punctuation
        { "scope": "punctuation.terminator.java", "settings": { "foreground": "#D4D4D4" }},
        { "scope": "punctuation.separator.comma.java", "settings": { "foreground": "#D4D4D4" }},
        { "scope": "punctuation.bracket.square.java", "settings": { "foreground": "#D4D4D4" }},
        { "scope": "punctuation.bracket.round.java", "settings": { "foreground": "#D4D4D4" }},
        { "scope": "punctuation.bracket.angle.java", "settings": { "foreground": "#D4D4D4" }},
        
        // Packages and imports
        { "scope": "entity.name.package.java", "settings": { "foreground": "#858585", "fontStyle": "" }},
        { "scope": "keyword.control.import.java", "settings": { "foreground": "#569CD6", "fontStyle": "" }}
    ];

    const updatedRules = [
        ...(existingColors.textMateRules || []).filter(rule => 
            !colorRules.some(r => r.scope === rule.scope)
        ),
        ...colorRules
    ];

    config.update('editor.tokenColorCustomizations', 
        { ...existingColors, textMateRules: updatedRules },
        vscode.ConfigurationTarget.Global
    );
}

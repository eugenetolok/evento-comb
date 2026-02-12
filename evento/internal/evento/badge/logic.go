package badge

import (
	"bytes"
	"encoding/json"
	"text/template"

	"github.com/eugenetolok/evento/pkg/model"
)

// ProcessBadgeTemplate takes a member and a template, and returns the final JSON payload.
func ProcessBadgeTemplate(member model.Member, templateJSON string) ([]byte, error) {
	// 1. Use text/template to replace placeholders
	tmpl, err := template.New("badge").Parse(templateJSON)
	if err != nil {
		return nil, err
	}

	var processedBuf bytes.Buffer
	data := map[string]interface{}{
		"Member": member,
	}
	if err := tmpl.Execute(&processedBuf, data); err != nil {
		return nil, err
	}

	// 2. Unmarshal the processed JSON into a map to handle special "zones" type
	var payload map[string]interface{}
	if err := json.Unmarshal(processedBuf.Bytes(), &payload); err != nil {
		return nil, err
	}

	// 3. Process the special elements
	elements, ok := payload["elements"].([]interface{})
	if !ok {
		// no elements to process, return as is
		return json.Marshal(payload)
	}

	var finalElements []interface{}
	memberGateShortNames := make(map[string]bool)
	// Collect all gate short names the member has access to
	for _, g := range member.Gates {
		if g.ShortName != "" {
			memberGateShortNames[g.ShortName] = true
		}
	}
	if member.Accreditation.Gates != nil {
		for _, g := range member.Accreditation.Gates {
			if g.ShortName != "" {
				memberGateShortNames[g.ShortName] = true
			}
		}
	}

	for _, el := range elements {
		elMap, isMap := el.(map[string]interface{})
		if !isMap {
			finalElements = append(finalElements, el)
			continue
		}

		if elType, ok := elMap["type"].(string); ok && elType == "zones" {
			// This is our special zones element, replace it
			zoneElements := generateZoneElements(elMap, memberGateShortNames)
			finalElements = append(finalElements, zoneElements...)
		} else {
			// This is a regular element, add it back
			finalElements = append(finalElements, el)
		}
	}

	payload["elements"] = finalElements

	return json.Marshal(payload)
}

// generateZoneElements creates the individual text elements for the access zones
func generateZoneElements(zoneTemplate map[string]interface{}, memberGates map[string]bool) []interface{} {
	var generatedElements []interface{}

	layout, ok := zoneTemplate["layout"].([]interface{})
	if !ok {
		return generatedElements
	}

	textProps, ok := zoneTemplate["text_properties"].(map[string]interface{})
	if !ok {
		return generatedElements
	}

	for _, zoneItem := range layout {
		zone, isMap := zoneItem.(map[string]interface{})
		if !isMap {
			continue
		}

		gateShortName, _ := zone["gate_short_name"].(string)
		x, _ := zone["x"].(float64)
		y, _ := zone["y"].(float64)

		hasAccess := memberGates[gateShortName]

		content := "X"
		if hasAccess {
			content = gateShortName
		}

		newTextProps := make(map[string]interface{})
		for k, v := range textProps {
			newTextProps[k] = v
		}
		newTextProps["content"] = content

		if hasAccess && gateShortName == "⇄" {
			newTextProps["font_file"] = "DejaVuSans.ttf"
			y -= 0.5
		} else {
			newTextProps["font_file"] = "vk.als.ttf"
		}

		element := map[string]interface{}{
			"type":   "text",
			"x":      x,
			"y":      y,
			"text":   newTextProps,
			"valign": "T",
		}
		generatedElements = append(generatedElements, element)
	}

	return generatedElements
}

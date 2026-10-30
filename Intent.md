# Call Coach — Product Intent

## Purpose

Call Coach is a web application that helps sales representatives follow predefined sales scripts during live calls. It guides the rep through talking points and branching decisions, provides space for notes, and preserves completed calls for later review.

Reps can create scripts directly in the web app or describe a conversation flow to an LLM agent connected through the application's MCP server. Every script must be reviewed and approved before it can be run.

## Core concepts

### Sales script

A sales script defines a conversation flow using two kinds of nodes:

- **Talking points:** Questions or statements for the rep to use during the conversation.
- **Conditional nodes:** Decisions with selectable options that lead to different subsequent nodes based on the lead's response.

The rep controls progression through the script. Talking points advance with a **Next** button; conditional nodes require the rep to select an option. The app follows the selected branch until the script ends.

### Script approval

Scripts can be created and edited before being marked as approved. Approval is an explicit action taken by the rep after reviewing the script. Only approved scripts offer a **Play** action and can start a call run.

### Script run

A script run is one execution of a sales script for a particular lead. It captures:

- Lead name, company, and phone number.
- The sequence of talking points and conditional nodes visited during the call.
- The options selected at conditional nodes, preserving the actual conversation path.
- Notes written by the rep.
- The rep's evaluation of the conversation's success.

The saved conversation represents the script path followed by the rep; automatic recording or transcription is not part of this brief.

## Application features

### Script library

The app provides a list of existing scripts. For each script, the rep can:

- Edit the script in the UI editor.
- View past runs.
- Start a new run using **Play**, if the script is approved.

The library makes each script's approval status visible.

### Visual script creation and editing

The UI editor allows reps to create and review conversation flows, edit questions and statements, and define conditional nodes, their response options, and their destinations. Reps can adjust scripts created through the API using the same editor, then mark them as approved when ready for use.

### API and MCP integration

The application exposes an API for creating sales scripts. A downloadable MCP server, available through the documentation page, enables an LLM agent to create scripts through that API.

The intended agent-assisted workflow is:

1. The rep downloads the MCP server from the documentation page and connects it to an LLM agent.
2. The rep describes the desired conversation flow to the agent.
3. The agent creates a new script through the MCP server.
4. The rep opens the web app and reviews the created script.
5. The rep makes any necessary changes in the UI editor and marks the script as approved.

### Lead details before a call

Starting an approved script first opens a lead-details form. The rep must enter the lead's name, company, and phone number and submit the form before the conversation flow is shown.

### Guided call interface

The run interface displays two script nodes at a time, beginning with the first two nodes in the flow. Near the end of a path, it displays the remaining node if only one remains. A notes text field appears beside the script and remains available during the call.

Progression follows these rules:

- The rep uses **Next** to advance through talking points.
- Whenever a conditional node is displayed, the **Next** button is absent. The rep must select one of that node's options to continue.
- Selecting an option determines the next part of the conversation flow and updates the displayed nodes to follow that branch.
- The rep continues until the selected path reaches the end of the script.

The rep makes decisions based on the live conversation with the lead; the app guides the flow according to those selections.

### Call completion and evaluation

At the end of the script, the rep finishes the conversation, adds any final notes, and clicks **Save**. The app then asks the rep to comment on the success of the conversation.

After the rep enters and submits this evaluation, the complete script run, lead details, notes, and evaluation are persisted for later review.

### Saved-run review

After saving, the app displays the complete conversation path as a scrollable list beside the notes. The saved run also retains the lead details and evaluation for later review.

The rep can return to the script library and open a script's past runs to review previously completed calls.

## End-to-end user journey

1. Create a script through the web editor or an LLM agent connected through MCP.
2. Review and edit the script in the web app.
3. Mark the script as approved.
4. Open the script library and click **Play** on the approved script.
5. Enter the lead's name, company, and phone number, then submit.
6. Use the two-node call view to follow the conversation while taking notes alongside it.
7. Advance talking points with **Next**, and select an option whenever a conditional node appears.
8. Reach the end of the script, add final notes, and click **Save**.
9. Enter an evaluation of the conversation's success and submit it.
10. Review the saved conversation path and notes.
11. Return to the script library to start another call, view past runs, or edit a script.

## Acceptance criteria

- A rep can create a script through the UI or through the API using an MCP-connected agent.
- An agent-created script appears in the web app for review and editing.
- A script can contain questions, statements, and conditional branches.
- Only approved scripts can be played.
- Every run requires lead name, company, and phone number before displaying the conversation flow.
- The call interface shows two nodes at a time where available, with notes beside them.
- A displayed conditional node removes the **Next** action and requires an option selection to continue.
- The selected option determines which branch is followed.
- Reaching the end allows the rep to finalize notes and initiate saving.
- Saving prompts for a success evaluation before the completed run is persisted.
- A saved run preserves the actual script path, selected options, lead details, notes, and evaluation.
- The saved conversation is reviewable as a scrollable list beside the notes, both immediately after saving and through the script's past runs.

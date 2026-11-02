# Worst-case length of one /predictions page of 5 entries, using today's entry layout
# minus the pot line (M5), and the modal input limits (question 200, options input 300).
question = "Q" * 200
# Options input of 300 chars split on ',' and rejoined with ', ': the most separators
# 300 chars can hold is 150 one-char options and 149 commas, each comma gaining a space.
options_input = ",".join(["x"] * 150)            # 299 chars, within the 300 limit
options = ", ".join(o.strip() for o in options_input.split(","))
typical_options = "1 week, 2 weeks, 1 month, 3 months"
def entry(opts, pid=99999, bets=999):
    return (f"**ID {pid}:** {question}\n**Options:** {opts}\n"
            f"🕒 Created: <t:1798761600:F>\n🎲 {bets} bet(s)\n\n")
header = "📋 **Active Predictions:**\n\n"
footer = "Page 99 of 99"
for label, opts in [("max question, max options", options),
                    ("max question, typical options", typical_options)]:
    e = entry(opts)
    page = header + e * 5 + footer
    print(f"{label}: entry={len(e)} page_of_5={len(page)} limit=2000 fits={len(page) <= 2000}")

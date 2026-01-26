import requests
import time

# URLs for your MCP server/device APIs (adjust as needed)
WASHING_MACHINE_EVENT_URL = "http://localhost:8080/washingMachine/events/finishedCycle"
LEDS_STATE_URL = "http://localhost:8083/leds/state"

def trigger_washing_machine_finished():
    # Simulate the washing machine finishing its cycle
    response = requests.post(WASHING_MACHINE_EVENT_URL)
    assert response.status_code == 200

def check_leds_blinked():
    # Wait a bit for automation to run
    time.sleep(2)
    # Check the state of the LEDs
    response = requests.get(LEDS_STATE_URL)
    assert response.status_code == 200
    state = response.json()
    # Assume the state contains a 'blinking' field
    return state.get("blinking", False)

def test_blink_leds_on_wash_finish():
    trigger_washing_machine_finished()
    if check_leds_blinked():
        print("✅ Test passed: LEDs blinked after washing machine finished.")
    else:
        print("❌ Test failed: LEDs did not blink.")

if __name__ == "__main__":
    test_blink_leds_on_wash_finish()
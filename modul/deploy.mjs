import { ethers } from "ethers";
import solc from "solc";
import chalk from "chalk";
import ora from "ora";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Setup imports for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Import utility modules using require
const walletUtils = require("../utils/wallet-utils.js");
const config = require("../utils/config.js");
const txLogger = require("../utils/transaction-logger.js");
const retryUtils = require("../utils/retry-utils.js");

console.log(chalk.blue("🚀 Starting Deploy Contract..."));
console.log(" ");

// Define chemical terms and planets for contract naming
const chemicalTerms = [
    "Atom", "Molecule", "Electron", "Proton", "Neutron", "Ion", "Isotope", "Reaction", "Catalyst", "Solution",
    "Acid", "Base", "pH", "Oxidation", "Reduction", "Bond", "Valence", "Electrolyte", "Polymer", "Monomer",
    "Enzyme", "Substrate", "Covalent", "Ionic", "Metal", "Nonmetal", "Gas", "Liquid", "Solid", "Plasma",
    "Entropy", "Enthalpy", "Thermodynamics", "OrganicChemistry", "InorganicChemistry", "Biochemistry", "PhysicalChemistry", "Analytical", "Synthesis", "Decomposition",
    "Exothermic", "Endothermic", "Stoichiometry", "Concentration", "Molarity", "Molality", "Titration", "Indicator", "Chromatography", "Spectroscopy",
    "Electrochemistry", "GalvanicCell", "Electrolysis", "Anode", "Cathode", "Electrode", "Hydrolysis", "Hydrogenation", "Dehydrogenation", "Polymerization",
    "Depolymerization", "Catalyst", "Inhibitor", "Adsorption", "Absorption", "Diffusion", "Osmosis", "Colloid", "Suspension", "Emulsion",
    "Aerosol", "Surfactant", "Detergent", "Soap", "AminoAcid", "Protein", "Carbohydrate", "Lipid", "Nucleotide", "DNA",
    "RNA", "ActivationEnergy", "Complex", "Ligand", "Coordination", "Crystal", "Amorphous", "Isomer", "Stereochemistry"
];

const planets = [
    "Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Ceres",
    "Eris", "Haumea", "Makemake", "Ganymede", "Titan", "Callisto", "Io", "Europa", "Triton", "Charon",
    "Titania", "Oberon", "Rhea", "Iapetus", "Dione", "Tethys", "Enceladus", "Miranda", "Ariel", "Umbriel",
    "Proteus", "Nereid", "Phobos", "Deimos", "Amalthea", "Himalia", "Elara", "Pasiphae", "Sinope", "Lysithea",
    "Carme", "Ananke", "Leda", "Thebe", "Adrastea", "Metis", "Callirrhoe", "Themisto", "Megaclite", "Taygete",
    "Chaldene", "Harpalyke", "Kalyke", "Iocaste", "Erinome", "Isonoe", "Praxidike", "Autonoe", "Thyone", "Hermippe",
    "Aitne", "Eurydome", "Euanthe", "Euporie", "Orthosie", "Sponde", "Kale", "Pasithee", "Hegemone", "Mneme",
    "Aoede", "Thelxinoe", "Arche", "Kallichore", "Helike", "Carpo", "Eukelade", "Cyllene", "Kore", "Herse",
    "Dia", "S2003J2", "S2003J3", "S2003J4", "S2003J5", "S2003J9", "S2003J10", "S2003J12", "S2003J15"
];

function generateRandomName() {
    const combinedTerms = [...chemicalTerms, ...planets];
    const shuffled = combinedTerms.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).join("");
}

const contractSource = `
pragma solidity ^0.8.0;

contract Counter {
    uint256 private count;
    
    event CountIncremented(uint256 newCount);
    
    function increment() public {
        count += 1;
        emit CountIncremented(count);
    }
    
    function getCount() public view returns (uint256) {
        return count;
    }
}
`;

function compileContract() {
    const spinner = ora("Compiling contract...").start();

    try {
        const input = {
            language: "Solidity",
            sources: { "Counter.sol": { content: contractSource } },
            settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } }
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input)));

        const contract = output.contracts["Counter.sol"].Counter;

        spinner.succeed(chalk.green("Contract compiled successfully!"));
        return { abi: contract.abi, bytecode: contract.evm.bytecode.object };
    } catch (error) {
        spinner.fail(chalk.red("Contract compilation failed!"));
        console.error(error);
        throw error;
    }
}

async function deployContract(wallet, contractName) {
    return retryUtils.retryWithBackoff(async () => {
        const { abi, bytecode } = compileContract();
        const spinner = ora(`Deploying contract ${contractName} to blockchain...`).start();

        try {
            txLogger.logInfo(
                wallet.address,
                "DeployContract",
                "Starting Deployment",
                `Contract name: ${contractName}`
            );

            const nonce = await wallet.provider.getTransactionCount(wallet.address, "latest");
            console.log(chalk.gray(`Using nonce: ${nonce}`));

            return await retryUtils.retryWithIncreasedGas(
                async (gasMultiplier = 1.0) => {
                    // Calculate gas price with multiplier
                    const gasPrice = (await wallet.provider.getGasPrice()).mul(
                        Math.floor(gasMultiplier * 100)
                    ).div(100);

                    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
                    let deployOptions = {};
                    
                    // Add gas price if multiplier is greater than 1
                    if (gasMultiplier > 1.0) {
                        deployOptions.gasPrice = gasPrice;
                    }
                    
                    const contract = await factory.deploy(deployOptions);

                    console.log("⏳ Waiting for transaction confirmation...");
                    const txReceipt = await contract.deployTransaction.wait();

                    if (!txReceipt) {
                        throw new Error("Failed to get transaction receipt.");
                    }

                    if (txReceipt.status !== 1) {
                        throw new Error("Deployment failed with status 0");
                    } else {
                        spinner.succeed(chalk.green(`Contract ${contractName} deployed successfully!`));
                        console.log(chalk.cyan.bold("\n📌 Contract Address: ") + chalk.yellow(contract.address));
                        console.log(chalk.cyan.bold("\n📜 Transaction Hash: ") + chalk.yellow(txReceipt.transactionHash));
                        
                        // Return transaction data
                        return {
                            contractAddress: contract.address,
                            transactionHash: txReceipt.transactionHash,
                            contractName: contractName
                        };
                    }
                },
                wallet,
                {
                    moduleName: "DeployContract",
                    actionName: `Deploy ${contractName}`
                }
            );
        } catch (error) {
            spinner.fail(chalk.red("Deployment failed!"));
            console.error(error);
            throw error;
        }
    }, {
        wallet,
        moduleName: "DeployContract",
        actionName: `Deploy ${contractName}`,
        maxRetries: 3
    });
}

async function runDeployProcess(wallet, numberOfContracts = 5) {
    console.log(chalk.blue.bold(`🚀 Deploying ${numberOfContracts} contracts...`));
    console.log(chalk.green(`Using wallet address: ${wallet.address}`));
    
    txLogger.logInfo(
        wallet.address,
        "DeployContract",
        "Process Started",
        `Deploying ${numberOfContracts} contracts`
    );
    
    const deployedContracts = [];
    
    try {
        for (let i = 0; i < numberOfContracts; i++) {
            const contractName = generateRandomName();
            console.log(chalk.yellow(`\n🔨 Deploying contract ${i + 1}/${numberOfContracts}: ${contractName}`));
            
            const result = await deployContract(wallet, contractName);
            
            if (result) {
                txLogger.logSuccess(
                    wallet.address,
                    "DeployContract",
                    `Deploy ${contractName}`,
                    result.transactionHash,
                    `Contract address: ${result.contractAddress}`
                );
                
                deployedContracts.push(result);
            }
            
            // Add delay between deployments if not the last one
            if (i < numberOfContracts - 1) {
                const delay = Math.floor(Math.random() * (6000 - 4000 + 1)) + 4000;
                console.log(chalk.gray(`⏳ Waiting for ${delay / 1000} seconds before next deployment...`));
                await retryUtils.delay(delay);
            }
        }
        
        console.log(chalk.green.bold("\n✅ All contracts deployed successfully! 🎉\n"));
        txLogger.logSuccess(
            wallet.address,
            "DeployContract",
            "Process Completed",
            null,
            `Successfully deployed ${deployedContracts.length} contracts`
        );
        
        return deployedContracts;
    } catch (error) {
        console.error(chalk.red(`\n❌ Deployment process failed: ${error.message}`));
        txLogger.logError(
            wallet.address,
            "DeployContract",
            "Process Failed",
            error.message
        );
        return deployedContracts;
    }
}

// Main function for execution
async function main() {
    try {
        // Get wallet using the utility
        const wallet = await walletUtils.getWallet();
        
        // Default to 5 contracts or use environment variable if set
        const numberOfContracts = process.env.NUMBER_OF_CONTRACTS 
            ? parseInt(process.env.NUMBER_OF_CONTRACTS) 
            : 5;
            
        await runDeployProcess(wallet, numberOfContracts);
    } catch (error) {
        console.error(chalk.red(`Fatal error: ${error.message}`));
        process.exit(1);
    }
}

// Run main function if this module is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error(chalk.red(`Unhandled error: ${error.message}`));
        process.exit(1);
    });
}

// Export functions for use in other modules
export { runDeployProcess, main, generateRandomName, compileContract };
export default runDeployProcess;
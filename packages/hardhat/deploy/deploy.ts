import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEGame2048 = await deploy("FHEGame2048", {
    from: deployer,
    log: true,
  });

  console.log(`FHEGame2048 contract: `, deployedFHEGame2048.address);
};
export default func;
func.id = "deploy_FHEGame2048"; // id required to prevent reexecution
func.tags = ["FHEGame2048"];
